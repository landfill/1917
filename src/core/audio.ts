// Web Audio로 모든 음악과 효과음을 합성한다. 샘플 파일은 하나도 쓰지 않는다.

export type Mood =
  | 'none' | 'title' | 'pastoral' | 'orders' | 'tension' | 'dread' | 'grief' | 'drive'
  | 'night' | 'lullaby' | 'river' | 'song' | 'run' | 'relief' | 'resolve';

const mtof = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// D 단조 기준 음 (MIDI)
const D2 = 38, A2 = 45, D3 = 50;

interface Player {
  bpm: number;
  /** 한 박을 몇 스텝으로 나누나 */
  div: number;
  step(i: number, time: number): void;
  start?(time: number): void;
  stop?(time: number): void;
}

interface Voice {
  out: GainNode;
  player: Player;
  next: number;
  i: number;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private verb!: ConvolverNode;
  private verbIn!: GainNode;
  private noise!: AudioBuffer;
  private voice: Voice | null = null;
  private mood: Mood = 'none';
  private stoppers: (() => void)[] = [];
  /** 0~1: 질주 장면에서 음악의 긴장도를 올린다 */
  intensity = 0;
  muted = false;

  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.5;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.8;
    this.sfxBus.connect(this.master);

    // 인공 잔향: 지수 감쇠 노이즈로 만든 임펄스 응답
    const len = ctx.sampleRate * 3.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.verb = ctx.createConvolver();
    this.verb.buffer = ir;
    this.verbIn = ctx.createGain();
    this.verbIn.gain.value = 1;
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.42;
    this.verbIn.connect(this.verb).connect(verbOut).connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    window.setInterval(() => this.schedule(), 25);
    const m = this.mood;
    this.mood = 'none';
    this.setMood(m);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.05);
  }

  get now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // ── 음악 ────────────────────────────────────────────
  setMood(m: Mood, fade = 1.6): void {
    if (m === this.mood) return;
    this.mood = m;
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (this.voice) {
      const old = this.voice;
      old.out.gain.cancelScheduledValues(t);
      old.out.gain.setValueAtTime(old.out.gain.value, t);
      old.out.gain.linearRampToValueAtTime(0, t + fade);
      old.player.stop?.(t + fade);
      setTimeout(() => old.out.disconnect(), (fade + 0.5) * 1000);
      this.voice = null;
    }
    const player = this.makePlayer(m);
    if (!player) return;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(1, t + Math.min(fade, 1.2));
    out.connect(this.musicBus);
    this.voice = { out, player, next: t + 0.05, i: 0 };
    player.start?.(t + 0.05);
  }

  private schedule(): void {
    const ctx = this.ctx;
    const v = this.voice;
    if (!ctx || !v) return;
    const dt = 60 / v.player.bpm / v.player.div;
    while (v.next < ctx.currentTime + 0.15) {
      v.player.step(v.i, v.next);
      v.i++;
      v.next += dt;
    }
  }

  // ── 악기 ────────────────────────────────────────────
  private env(g: GainNode, t: number, a: number, peak: number, d: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private send(node: AudioNode, dest: AudioNode, wet = 0.3): void {
    node.connect(dest);
    if (wet > 0) {
      const s = this.ctx!.createGain();
      s.gain.value = wet;
      node.connect(s).connect(this.verbIn);
    }
  }

  private musicOut(): AudioNode {
    return this.voice ? this.voice.out : this.musicBus;
  }

  /** 피아노 비슷한 타악 음 */
  piano(n: number, t: number, dur = 1.6, vol = 0.18, wet = 0.45): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3200, t);
    f.frequency.exponentialRampToValueAtTime(600, t + dur);
    for (const [mul, type, amp] of [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = mtof(n) * mul;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(f);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    this.env(g, t, 0.006, vol, dur);
    f.connect(g);
    this.send(g, this.musicOut(), wet);
  }

  /** 종소리 / 오르골 */
  bell(n: number, t: number, dur = 2.4, vol = 0.08, wet = 0.6): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    for (const [mul, amp, dd] of [[1, 1, 1], [2.76, 0.4, 0.5], [5.4, 0.18, 0.3]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = mtof(n) * mul;
      const og = ctx.createGain();
      this.env(og, t, 0.004, amp, dur * dd);
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    g.gain.value = vol;
    this.send(g, this.musicOut(), wet);
  }

  /** 현악 패드 (톱니파 둘을 살짝 어긋나게) */
  pad(notes: number[], t: number, dur: number, vol = 0.05, cutoff = 900, wet = 0.5, attack = 1.2): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    f.Q.value = 0.4;
    for (const n of notes) {
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(n);
        o.detune.value = det;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 2);
      }
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.6);
    f.connect(g);
    this.send(g, this.musicOut(), wet);
  }

  /** 짧게 끊는 현악 (스타카토 오스티나토) */
  stacc(n: number, t: number, dur = 0.18, vol = 0.07, cutoff = 1400, wet = 0.2): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(cutoff * 0.35, t + dur);
    for (const det of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(n);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    this.env(g, t, 0.01, vol, dur);
    f.connect(g);
    this.send(g, this.musicOut(), wet);
  }

  /** 저음 사인 */
  bass(n: number, t: number, dur: number, vol = 0.14): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = mtof(n);
    const g = ctx.createGain();
    this.env(g, t, 0.02, vol, dur);
    o.connect(g);
    this.send(g, this.musicOut(), 0.1);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  /** 사람 목소리 비슷한 모음 '아' — 톱니파에 포먼트 필터 */
  sing(n: number, t: number, dur: number, vol = 0.12): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = mtof(n);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(mtof(n) * 0.012, t + Math.min(0.6, dur * 0.6));
    lfo.connect(lg).connect(o.frequency);
    const g = ctx.createGain();
    for (const [fq, q, amp] of [[700, 8, 1], [1150, 10, 0.55], [2800, 14, 0.25]] as const) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = fq;
      bp.Q.value = q;
      const bg = ctx.createGain();
      bg.gain.value = amp * 3;
      o.connect(bp).connect(bg).connect(g);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.12);
    g.gain.setValueAtTime(vol, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    this.send(g, this.musicOut(), 0.7);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.3);
    lfo.stop(t + dur + 0.3);
  }

  /** 지속음 드론. 정지 함수를 돌려준다 */
  drone(n: number, t: number, vol = 0.05, type: OscillatorType = 'sawtooth', cutoff = 380): () => void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07 + Math.random() * 0.05;
    const lg = ctx.createGain();
    lg.gain.value = cutoff * 0.4;
    lfo.connect(lg).connect(f.frequency);
    const oscs: OscillatorNode[] = [lfo];
    for (const det of [-8, 0, 7]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = mtof(n);
      o.detune.value = det;
      o.connect(f);
      oscs.push(o);
    }
    f.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 2.5);
    this.send(g, this.musicOut(), 0.4);
    oscs.forEach((o) => o.start(t));
    return () => {
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + 1.5);
      oscs.forEach((o) => o.stop(now + 1.6));
    };
  }

  private noiseSrc(t: number, dur: number): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = Math.random();
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
    return s;
  }

  /** 팀파니 / 큰북 */
  drum(t: number, n = 33, vol = 0.35, dest?: AudioNode): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(mtof(n) * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(mtof(n), t + 0.08);
    const g = ctx.createGain();
    this.env(g, t, 0.004, vol, 0.7);
    o.connect(g);
    this.send(g, dest ?? this.musicOut(), 0.3);
    o.start(t);
    o.stop(t + 0.9);
  }

  snare(t: number, vol = 0.08, dest?: AudioNode): void {
    const ctx = this.ctx!;
    const s = this.noiseSrc(t, 0.2);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    const g = ctx.createGain();
    this.env(g, t, 0.002, vol, 0.12);
    s.connect(f).connect(g);
    this.send(g, dest ?? this.musicOut(), 0.25);
  }

  tick(t: number, hi = true, vol = 0.05, dest?: AudioNode): void {
    const ctx = this.ctx!;
    const s = this.noiseSrc(t, 0.04);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = hi ? 5200 : 3600;
    f.Q.value = 6;
    const g = ctx.createGain();
    this.env(g, t, 0.001, vol, 0.03);
    s.connect(f).connect(g);
    this.send(g, dest ?? this.musicOut(), 0.1);
  }

  // ── 무드별 작곡 ─────────────────────────────────────
  private makePlayer(m: Mood): Player | null {
    const A = this;
    const stops: (() => void)[] = [];
    const withDrones = (starts: (t: number) => void): Pick<Player, 'start' | 'stop'> => ({
      start: (t) => starts(t),
      stop: () => { stops.forEach((s) => s()); stops.length = 0; },
    });
    // 코드 진행 (D 단조): i – VI – III – VII
    const prog = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]];
    const r = Math.random;

    switch (m) {
      case 'none':
        return null;
      case 'title':
        // 회중시계 초침 소리 + 낮은 드론 + 드문드문 종소리
        return {
          bpm: 60, div: 2,
          ...withDrones((t) => { stops.push(A.drone(D2, t, 0.035, 'sawtooth', 240), A.drone(A2, t, 0.02, 'triangle', 500)); }),
          step(i, t) {
            A.tick(t, i % 2 === 0, 0.05);
            if (i % 16 === 0) A.bell([74, 69, 72, 77, 76][(i / 16) % 5], t, 4, 0.04);
            if (i % 32 === 8) A.pad([62, 65, 69], t, 6, 0.018, 700);
          },
        };
      case 'pastoral':
        return {
          bpm: 70, div: 2,
          step(i, t) {
            const bar = Math.floor(i / 8) % 8;
            const ch = prog[Math.floor(bar / 2) % 4];
            if (i % 16 === 0) { A.pad(ch, t, 6.6, 0.028, 1000); A.bass(ch[0] - 12, t, 6, 0.08); }
            const arp = [0, 1, 2, 1, 2, 1, 0, 2];
            if (r() < 0.75) A.piano(ch[arp[i % 8]] + 12, t, 1.8, 0.07);
            if (i % 32 === 28 && r() < 0.6) A.piano(ch[2] + 24, t, 3, 0.05);
          },
        };
      case 'orders':
        return {
          bpm: 60, div: 2,
          ...withDrones((t) => { stops.push(A.drone(D2, t, 0.05, 'sawtooth', 300)); }),
          step(i, t) {
            A.tick(t, i % 2 === 0, 0.035);
            if (i % 16 === 0) A.pad(i % 32 === 0 ? [50, 53, 57] : [50, 55, 58], t, 7.5, 0.028, 700);
            if (i % 8 === 4 && r() < 0.5) A.piano(62 + [0, 3, 5, 7][Math.floor(r() * 4)], t, 2.5, 0.05);
          },
        };
      case 'tension':
        return {
          bpm: 96, div: 2,
          ...withDrones((t) => { stops.push(A.drone(D2 - 12, t, 0.05, 'sawtooth', 200)); }),
          step(i, t) {
            const bar = Math.floor(i / 8);
            const root = [D2, D2, D2 - 2, D2 - 4][Math.floor(bar / 2) % 4];
            A.stacc(root + 12, t, 0.16, i % 2 === 0 ? 0.06 : 0.035, 900);
            if (i % 4 === 0) A.tick(t, true, 0.025);
            if (i % 32 === 0) A.pad([root + 24, root + 27, root + 31], t, 9.5, 0.022, 800);
            if (i % 16 === 12 && r() < 0.5) A.drum(t, 31, 0.18);
          },
        };
      case 'dread':
        return {
          bpm: 50, div: 1,
          ...withDrones((t) => {
            stops.push(A.drone(D2 - 12, t, 0.06, 'sawtooth', 160), A.drone(51, t, 0.012, 'sine', 800), A.drone(50, t, 0.012, 'sine', 800));
          }),
          step(i, t) {
            if (i % 6 === 0) A.drum(t, 28, 0.12);
            if (r() < 0.15) A.bell(86 + Math.floor(r() * 3), t, 3, 0.015);
          },
        };
      case 'grief':
        return {
          bpm: 52, div: 2,
          step(i, t) {
            const seq = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];
            const ch = seq[Math.floor(i / 8) % 4];
            if (i % 8 === 0) { A.pad(ch, t, 8.8, 0.024, 650, 0.6, 2.5); A.bass(ch[0] - 12, t, 8, 0.07); }
            const mel = [69, 0, 67, 65, 0, 64, 65, 0, 62, 0, 0, 64, 65, 0, 64, 0, 62, 0, 60, 58, 0, 57, 0, 0, 61, 0, 64, 0, 62, 0, 0, 0];
            const n = mel[i % 32];
            if (n) A.piano(n, t, 3, 0.09, 0.6);
          },
        };
      case 'drive':
        return {
          bpm: 84, div: 2,
          step(i, t) {
            const seq = [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]];
            const ch = seq[Math.floor(i / 16) % 4];
            if (i % 16 === 0) { A.pad(ch, t, 11, 0.022, 900); A.bass(ch[0] - 12, t, 10, 0.06); }
            A.stacc(ch[i % 3] + 12, t, 0.14, 0.025, 1100);
          },
        };
      case 'night':
        return {
          bpm: 60, div: 2,
          ...withDrones((t) => { stops.push(A.drone(D2, t, 0.045, 'sawtooth', 220), A.drone(81, t, 0.008, 'sine', 3000)); }),
          step(i, t) {
            if (i % 12 === 0) A.drum(t + r() * 0.3, 26, 0.16);
            if (i % 16 === 8) A.pad([62, 65, 70], t, 7, 0.016, 1200);
            if (r() < 0.18) A.bell(79 + [0, 3, 5, 8][Math.floor(r() * 4)], t, 3, 0.02);
          },
        };
      case 'lullaby': {
        // 오르골 — 코드 원작의 자장가가 아닌 창작 선율
        const mel = [65, 69, 72, 69, 70, 69, 67, 0, 64, 67, 70, 67, 69, 67, 65, 0, 65, 69, 72, 77, 76, 74, 72, 0, 70, 69, 67, 64, 65, 0, 0, 0];
        return {
          bpm: 76, div: 2,
          step(i, t) {
            const n = mel[i % 32];
            if (n) A.bell(n + 12, t, 1.8, 0.05, 0.5);
            if (i % 8 === 0) A.pad([53, 57, 60], t, 4, 0.012, 600);
          },
        };
      }
      case 'river':
        return {
          bpm: 108, div: 4,
          ...withDrones((t) => { stops.push(A.drone(D2, t, 0.04, 'sawtooth', 300)); }),
          step(i, t) {
            const seq = [[50, 57, 62, 64, 65, 64, 62, 57], [46, 53, 58, 60, 62, 60, 58, 53], [53, 60, 65, 67, 69, 67, 65, 60], [48, 55, 60, 62, 64, 62, 60, 55]];
            const ch = seq[Math.floor(i / 32) % 4];
            A.piano(ch[i % 8] + 12, t, 0.9, 0.05, 0.5);
            if (i % 32 === 0) A.pad([ch[0], ch[1], ch[2]], t, 4.6, 0.024, 1100);
          },
        };
      case 'song': {
        // 전통 민요풍 선율을 무반주 목소리로. [음, 길이(스텝)]
        const tune: [number, number][] = [
          [57, 2], [62, 4], [62, 2], [64, 2], [65, 4], [65, 2], [64, 2], [62, 4], [0, 2],
          [65, 2], [69, 4], [69, 2], [67, 2], [65, 6], [0, 4],
          [65, 2], [67, 4], [67, 2], [65, 2], [64, 4], [62, 2], [60, 2], [62, 6], [0, 4],
          [57, 2], [62, 4], [62, 2], [64, 2], [65, 4], [64, 2], [62, 2], [60, 2], [57, 4], [62, 8], [0, 8],
        ];
        const starts: Record<number, [number, number]> = {};
        let s = 0;
        for (const [n, d] of tune) { if (n) starts[s] = [n, d]; s += d; }
        const total = s;
        return {
          bpm: 66, div: 2,
          ...withDrones((t) => { stops.push(A.drone(D2, t, 0.025, 'triangle', 400), A.drone(A2 + 12, t, 0.012, 'triangle', 600)); }),
          step(i, t) {
            const k = i % total;
            const e = starts[k];
            if (e) A.sing(e[0], t, (e[1] * 60) / 66 / 2 * 0.95, 0.1);
          },
        };
      }
      case 'run':
        return {
          bpm: 128, div: 4,
          ...withDrones((t) => { stops.push(A.drone(D2 - 12, t, 0.06, 'sawtooth', 260)); }),
          step(i, t) {
            const k = A.intensity;
            const bar = Math.floor(i / 16);
            const seq = [D3, D3, D3 - 4, D3 - 2, D3 + 3, D3 + 3, D3 - 2, D3 - 5];
            const root = seq[bar % 8];
            const oct = k > 0.55 ? 24 : 12;
            const pat = [0, 12, 7, 12, 0, 12, 7, 15];
            A.stacc(root + oct - 12 + pat[i % 8], t, 0.11, 0.05 + k * 0.03, 1200 + k * 1800);
            if (i % 8 === 0) A.drum(t, 33, 0.3 + k * 0.1);
            if (i % 8 === 4 && k > 0.2) A.drum(t, 36, 0.18);
            if (i % 4 === 2) A.snare(t, 0.03 + k * 0.05);
            if (k > 0.7 && i % 2 === 1) A.snare(t, 0.025);
            if (i % 32 === 0) A.pad([root + 12, root + 15, root + 19, root + 24], t, 4.2, 0.03 + k * 0.03, 900 + k * 2200, 0.4, 0.6);
          },
        };
      case 'relief':
        return {
          bpm: 56, div: 2,
          step(i, t) {
            const seq = [[50, 53, 57, 62], [53, 57, 60, 65], [46, 53, 58, 62], [53, 57, 60, 67]];
            const ch = seq[Math.floor(i / 8) % 4];
            if (i % 8 === 0) { A.pad(ch, t, 8.5, 0.028, 900, 0.6, 2); A.bass(ch[0] - 12, t, 8, 0.07); }
            if (i % 8 === 6 && r() < 0.6) A.piano(ch[3] + 12, t, 3, 0.05);
          },
        };
      case 'resolve':
        return {
          bpm: 58, div: 2,
          step(i, t) {
            // D 장조로 풀려나는 결말
            const seq = [[50, 54, 57, 62], [55, 59, 62, 66], [47, 54, 59, 62], [45, 52, 57, 61]];
            const ch = seq[Math.floor(i / 8) % 4];
            if (i % 8 === 0) { A.pad(ch, t, 8.6, 0.03, 1100, 0.6, 2); A.bass(ch[0] - 12, t, 8, 0.07); }
            const mel = [74, 0, 73, 71, 0, 69, 0, 0, 71, 0, 74, 0, 76, 0, 0, 0, 78, 0, 76, 74, 0, 73, 0, 71, 69, 0, 0, 71, 69, 0, 0, 0];
            const n = mel[i % 32];
            if (n) A.piano(n - 12, t, 3, 0.08, 0.6);
          },
        };
    }
  }

  // ── 효과음 ──────────────────────────────────────────
  private get T(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private ok(): boolean {
    return !!this.ctx;
  }

  /** 필터 노이즈 한 방 */
  private burst(t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, vol: number, a = 0.005, q = 0.7, wet = 0.2): void {
    const ctx = this.ctx!;
    const s = this.noiseSrc(t, dur + 0.1);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    this.env(g, t, a, vol, dur);
    s.connect(f).connect(g);
    this.send(g, this.sfxBus, wet);
  }

  explosion(near = 1): void {
    if (!this.ok()) return;
    const t = this.T;
    const v = 0.25 + near * 0.75;
    this.burst(t, 1.8 + near, 'lowpass', 1800 * near + 400, 60, 0.9 * v, 0.004, 0.8, 0.35);
    this.burst(t, 0.25, 'highpass', 800, 3000, 0.25 * near, 0.001);
    this.drum(t, 24, 0.9 * v, this.sfxBus);
    if (near > 0.5) this.burst(t + 0.3, 2.2, 'bandpass', 2400, 600, 0.06 * near, 0.4, 1.2, 0.4); // 흙 떨어지는 소리
  }

  distantBoom(): void {
    if (!this.ok()) return;
    const t = this.T;
    this.burst(t, 2.2, 'lowpass', 300, 40, 0.35, 0.02, 0.8, 0.5);
    this.drum(t, 22, 0.25, this.sfxBus);
  }

  /** 포탄이 날아오는 휘파람 소리 */
  incoming(dur = 1.1, vol = 0.07): void {
    if (!this.ok()) return;
    const ctx = this.ctx!;
    const t = this.T;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(2200 + Math.random() * 300, t);
    o.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    this.send(g, this.sfxBus, 0.2);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  gunshot(near = 1): void {
    if (!this.ok()) return;
    const t = this.T;
    this.burst(t, 0.35, 'lowpass', 5000, 200, 0.55 * near, 0.001, 0.8, 0.6);
    this.drum(t, 40, 0.3 * near, this.sfxBus);
  }

  machineGun(n = 8, near = 0.5): void {
    if (!this.ok()) return;
    const t = this.T;
    for (let i = 0; i < n; i++) {
      this.burst(t + i * 0.09, 0.08, 'bandpass', 1800, 500, 0.3 * near, 0.001, 1, 0.4);
    }
  }

  /** 참호 호루라기 */
  whistle(dur = 1.2, vol = 0.12): void {
    if (!this.ok()) return;
    const ctx = this.ctx!;
    const t = this.T;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 2650;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 38;
    const lg = ctx.createGain();
    lg.gain.value = 140;
    lfo.connect(lg).connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2700;
    f.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.04);
    g.gain.setValueAtTime(vol, t + dur - 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g);
    this.send(g, this.sfxBus, 0.5);
    o.start(t); lfo.start(t);
    o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }

  heartbeat(vol = 0.5): void {
    if (!this.ok()) return;
    const t = this.T;
    this.drum(t, 26, 0.35 * vol, this.sfxBus);
    this.drum(t + 0.18, 24, 0.25 * vol, this.sfxBus);
  }

  clockTick(): void {
    if (!this.ok()) return;
    this.tick(this.T, true, 0.08, this.sfxBus);
  }

  crack(): void {
    if (!this.ok()) return;
    const t = this.T;
    this.burst(t, 0.12, 'highpass', 2000, 5000, 0.35, 0.001);
    this.burst(t + 0.05, 0.4, 'bandpass', 900, 300, 0.2, 0.002, 2);
  }

  paper(): void {
    if (!this.ok()) return;
    const t = this.T;
    for (let i = 0; i < 5; i++) this.burst(t + i * 0.07 + Math.random() * 0.03, 0.09, 'bandpass', 3500, 2000, 0.07, 0.005, 1.5, 0.1);
  }

  squeak(): void {
    if (!this.ok()) return;
    const ctx = this.ctx!;
    const t = this.T;
    for (let k = 0; k < 3; k++) {
      const o = ctx.createOscillator();
      o.type = 'square';
      const s = t + k * 0.12;
      o.frequency.setValueAtTime(3200, s);
      o.frequency.exponentialRampToValueAtTime(4200, s + 0.05);
      const g = ctx.createGain();
      this.env(g, s, 0.002, 0.025, 0.06);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 3600;
      o.connect(f).connect(g);
      this.send(g, this.sfxBus, 0.1);
      o.start(s);
      o.stop(s + 0.1);
    }
  }

  rumble(dur = 2.5, vol = 0.5): void {
    if (!this.ok()) return;
    const t = this.T;
    this.burst(t, dur, 'lowpass', 400, 50, vol, 0.2, 0.7, 0.3);
  }

  /** 지속되는 환경음: 물, 불, 바람, 엔진 */
  ambience(kind: 'water' | 'fire' | 'wind' | 'engine' | 'plane' | 'rain', dur: number, vol = 0.2): void {
    if (!this.ok()) return;
    const ctx = this.ctx!;
    const t = this.T;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(1.5, dur * 0.3));
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    if (kind === 'engine' || kind === 'plane') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const base = kind === 'engine' ? 42 : 95;
      o.frequency.setValueAtTime(base, t);
      if (kind === 'plane') {
        o.frequency.linearRampToValueAtTime(base * 1.25, t + dur * 0.45);
        o.frequency.linearRampToValueAtTime(base * 0.7, t + dur);
      }
      const lfo = ctx.createOscillator();
      lfo.frequency.value = kind === 'engine' ? 9 : 23;
      const lg = ctx.createGain();
      lg.gain.value = base * 0.1;
      lfo.connect(lg).connect(o.frequency);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = kind === 'engine' ? 300 : 900;
      o.connect(f).connect(g);
      o.start(t); lfo.start(t);
      o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    } else {
      const s = this.noiseSrc(t, dur);
      const f = ctx.createBiquadFilter();
      const cfg = { water: ['lowpass', 900], fire: ['bandpass', 1400], wind: ['bandpass', 500], rain: ['highpass', 3000] } as const;
      f.type = cfg[kind][0];
      f.frequency.value = cfg[kind][1];
      const lfo = ctx.createOscillator();
      lfo.frequency.value = kind === 'fire' ? 6 : 0.3;
      const lg = ctx.createGain();
      lg.gain.value = cfg[kind][1] * 0.35;
      lfo.connect(lg).connect(f.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.1);
      s.connect(f).connect(g);
      if (kind === 'fire') for (let i = 0; i < dur * 4; i++) this.burst(t + Math.random() * dur, 0.03, 'highpass', 3000, 4000, 0.05 * vol * 4, 0.001);
    }
    this.send(g, this.sfxBus, 0.25);
  }

  birds(): void {
    if (!this.ok()) return;
    const ctx = this.ctx!;
    const t0 = this.T;
    for (let k = 0; k < 4; k++) {
      const t = t0 + k * 0.16 + Math.random() * 0.05;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f = 2800 + Math.random() * 1400;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.06);
      o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.1);
      const g = ctx.createGain();
      this.env(g, t, 0.005, 0.02, 0.1);
      o.connect(g);
      this.send(g, this.sfxBus, 0.4);
      o.start(t);
      o.stop(t + 0.15);
    }
  }

  splash(): void {
    if (!this.ok()) return;
    const t = this.T;
    this.burst(t, 1.2, 'lowpass', 3000, 300, 0.5, 0.003, 0.6, 0.4);
    this.drum(t, 30, 0.3, this.sfxBus);
  }

  flare(): void {
    if (!this.ok()) return;
    const t = this.T;
    this.burst(t, 0.15, 'lowpass', 2000, 200, 0.4, 0.001);
    this.burst(t + 0.1, 4, 'highpass', 4000, 3000, 0.05, 0.3, 0.7, 0.3);
  }

  thud(): void {
    if (!this.ok()) return;
    const t = this.T;
    this.drum(t, 30, 0.35, this.sfxBus);
    this.burst(t, 0.2, 'lowpass', 800, 150, 0.25, 0.002);
  }

  step(): void {
    if (!this.ok()) return;
    this.burst(this.T, 0.07, 'lowpass', 600, 200, 0.05 + Math.random() * 0.03, 0.002, 1, 0);
  }

  /** 멀리서 들려오는 함성 */
  crowd(dur = 3, vol = 0.12): void {
    if (!this.ok()) return;
    const ctx = this.ctx!;
    const t = this.T;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    for (let k = 0; k < 6; k++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 140 + Math.random() * 120;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 650 + Math.random() * 300;
      bp.Q.value = 4;
      o.connect(bp).connect(g);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    this.send(g, this.sfxBus, 0.6);
  }

  stopAll(): void {
    this.stoppers.forEach((s) => s());
    this.stoppers = [];
  }
}

export const audio = new AudioEngine();
