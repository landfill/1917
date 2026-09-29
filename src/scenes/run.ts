// XIII. 질주 — 포탄과 돌격하는 동료 병사들 사이를 가로질러 매켄지 대령에게 달린다.
import { Ctx, R, P, W, H, disc, line, clamp, lerp, text } from '../core/gfx';
import { soldier, soldierBack, blast, smoke, sandbags } from '../art/sprites';
import { sky, ridge, mudStrip, haze } from '../art/env';
import type { FxApi, GameScene, InputState } from './types';

const WORLD = 2400;
const TOP = 104;
const BOT = 168;
const GOAL = WORLD - 50;

interface Runner { x: number; y: number; vx: number; vy: number; phase: number; down: number; seed: number }
interface Shell { x: number; y: number; fuse: number; total: number }
interface Boom { x: number; y: number; t: number; seed: number; size: number }
interface Crater { x: number; y: number; r: number }

const st = {
  p: { x: 40, y: 150, vx: 0, vy: 0, face: 1 as 1 | -1, stun: 0, inv: 0, hp: 3, stamina: 1, phase: 0, step: 0, climb: 0 },
  runners: [] as Runner[],
  shells: [] as Shell[],
  booms: [] as Boom[],
  craters: [] as Crater[],
  far: [] as { x: number; t: number }[],
  camX: 0,
  time: 0,
  limit: 80,
  intro: 0,
  started: false,
  spawnT: 0,
  shellT: 2,
  farT: 0,
  seed: 1,
  fails: 0,
  reason: '',
  hitFlash: 0,
};

function rnd(): number {
  st.seed = (st.seed * 16807) % 2147483647;
  return (st.seed - 1) / 2147483646;
}

function progress(): number {
  return clamp((st.p.x - 40) / (GOAL - 40), 0, 1);
}

function spawnRunners(): void {
  const prog = progress();
  const n = 3 + Math.floor(rnd() * 3 + prog * 3);
  for (let i = 0; i < n; i++) {
    let x = st.camX + 30 + rnd() * (W - 20);
    if (Math.abs(x - st.p.x) < 10) x += 20;
    st.runners.push({
      x,
      y: BOT + 14 + rnd() * 12,
      vx: (rnd() - 0.5) * 12,
      vy: -(38 + rnd() * 26 + prog * 10),
      phase: rnd(),
      down: -1,
      seed: Math.floor(rnd() * 1e6),
    });
  }
}

function spawnShell(fx: FxApi): void {
  const prog = progress();
  // 플레이어의 앞길을 대충 겨냥한다 (정확히 노리지는 않는다)
  const lead = (0.3 + rnd() * 0.5) * (1 - st.fails * 0.15);
  const x = st.p.x + st.p.vx * lead + (rnd() - 0.5) * 130;
  const y = clamp(st.p.y + st.p.vy * lead + (rnd() - 0.5) * 60, TOP + 4, BOT);
  const fuse = 1.25 - prog * 0.25 + st.fails * 0.08;
  st.shells.push({ x, y, fuse, total: fuse });
  if (Math.abs(x - st.p.x) < 200) fx.audio.incoming(fuse, 0.06);
}

function explode(s: Shell, fx: FxApi): void {
  st.booms.push({ x: s.x, y: s.y, t: 0, seed: Math.floor(rnd() * 1e6), size: 1 });
  st.craters.push({ x: s.x, y: s.y, r: 7 + rnd() * 4 });
  if (st.craters.length > 60) st.craters.shift();
  const d = Math.hypot(s.x - st.p.x, (s.y - st.p.y) * 1.8);
  const near = clamp(1 - d / 260, 0.15, 1);
  fx.audio.explosion(near);
  fx.shake(2 + near * 7);
  for (const r of st.runners) {
    if (r.down < 0 && Math.hypot(r.x - s.x, (r.y - s.y) * 1.8) < 20) r.down = 0;
  }
  if (d < 15 && st.p.inv <= 0) {
    st.p.hp--;
    st.p.stun = 1.3;
    st.p.inv = 2.2;
    const a = Math.atan2(st.p.y - s.y, st.p.x - s.x || 1);
    st.p.vx = Math.cos(a) * 70;
    st.p.vy = Math.sin(a) * 40;
    st.hitFlash = 1;
    fx.flash(0.55);
    fx.audio.heartbeat(1);
  }
}

export const sceneRun: GameScene = {
  kind: 'game',
  num: 13,
  title: '질주',
  en: 'THE RUN',
  clock: '4월 7일 · 05:40',
  mood: 'run',
  enter: 'pan',

  reset(fx, fails) {
    st.p = { x: 40, y: 150, vx: 0, vy: 0, face: 1, stun: 0, inv: 0, hp: 3, stamina: 1, phase: 0, step: 0, climb: 0 };
    st.runners = [];
    st.shells = [];
    st.booms = [];
    st.craters = [];
    st.far = [];
    st.camX = 0;
    st.time = 0;
    st.fails = fails;
    st.limit = 75 + Math.min(fails, 3) * 10;
    st.intro = 0;
    st.started = false;
    st.spawnT = 0.5;
    st.shellT = 3.5;
    st.farT = 0;
    st.seed = 12345 + fails * 777;
    st.reason = '';
    st.hitFlash = 0;
    fx.audio.intensity = 0;
    // 시작 전 이미 돌격 중인 1차 공격 병사들
    for (let i = 0; i < 16; i++) {
      st.runners.push({ x: 20 + rnd() * 300, y: TOP + rnd() * (BOT - TOP), vx: (rnd() - 0.5) * 10, vy: -(40 + rnd() * 20), phase: rnd(), down: -1, seed: i });
    }
  },

  update(dt, input: InputState, fx) {
    const p = st.p;
    st.hitFlash = Math.max(0, st.hitFlash - dt * 2);
    for (const b of st.booms) b.t += dt;
    st.booms = st.booms.filter((b) => b.t < 3);

    // 먼 포격 (배경)
    st.farT -= dt;
    if (st.farT <= 0) {
      st.farT = 0.6 + rnd() * 1.4;
      st.far.push({ x: st.camX * 0.4 + rnd() * W, t: 0 });
      if (rnd() < 0.5) fx.audio.distantBoom();
    }
    for (const f of st.far) f.t += dt;
    st.far = st.far.filter((f) => f.t < 2.5);

    // 병사 이동은 도입부에도 계속
    for (const r of st.runners) {
      if (r.down >= 0) { r.down += dt; continue; }
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.phase += dt * 2.4;
    }
    st.runners = st.runners.filter((r) => r.y > TOP - 36 && r.down < 5 && r.x > st.camX - 60 && r.x < st.camX + W + 60);

    if (!st.started) {
      st.intro += dt;
      p.climb = clamp(st.intro / 2.2, 0, 1);
      p.y = lerp(BOT + 18, 150, p.climb);
      if (st.intro > 2.6) {
        st.started = true;
        fx.audio.whistle(1.3, 0.12);
        fx.audio.crowd(3, 0.1);
      }
      return 'play';
    }

    st.time += dt;
    const prog = progress();
    fx.audio.intensity = prog;

    // 플레이어
    if (p.stun > 0) {
      p.stun -= dt;
      p.vx *= Math.pow(0.02, dt);
      p.vy *= Math.pow(0.02, dt);
    } else {
      const len = Math.hypot(input.x, input.y);
      const ix = len > 1 ? input.x / len : input.x;
      const iy = len > 1 ? input.y / len : input.y;
      const sprinting = input.sprint && p.stamina > 0.05 && len > 0.1;
      const sp = sprinting ? 98 : 62;
      p.vx = lerp(p.vx, ix * sp, 1 - Math.pow(0.001, dt));
      p.vy = lerp(p.vy, iy * sp * 0.72, 1 - Math.pow(0.001, dt));
      p.stamina = clamp(p.stamina + (sprinting ? -0.42 : 0.2) * dt, 0, 1);
      if (Math.abs(ix) > 0.1) p.face = ix > 0 ? 1 : -1;
    }
    p.inv = Math.max(0, p.inv - dt);
    p.x = clamp(p.x + p.vx * dt, 12, WORLD - 10);
    p.y = clamp(p.y + p.vy * dt, TOP, BOT);
    const speed = Math.hypot(p.vx, p.vy);
    p.phase += dt * (speed / 28);
    p.step -= dt * speed;
    if (p.step < 0 && p.stun <= 0) {
      p.step = 18;
      fx.audio.step();
    }

    // 카메라: 진행 방향 앞쪽을 더 보여 준다
    const target = clamp(p.x - 110, 0, WORLD - W);
    st.camX = lerp(st.camX, target, 1 - Math.pow(0.02, dt));

    // 돌격 병사 생성과 충돌
    st.spawnT -= dt;
    if (st.spawnT <= 0) {
      spawnRunners();
      st.spawnT = 1.1 - prog * 0.45 + rnd() * 0.5;
    }
    if (p.stun <= 0 && p.inv <= 0) {
      for (const r of st.runners) {
        if (r.down >= 0) continue;
        if (Math.abs(r.x - p.x) < 5.5 && Math.abs(r.y - p.y) < 4) {
          p.stun = 0.8;
          p.inv = 0.6;
          p.vx = (p.x - r.x >= 0 ? 1 : -1) * 36;
          p.vy = r.vy * 0.6;
          fx.audio.thud();
          fx.shake(2.5);
          break;
        }
      }
    }

    // 포탄
    st.shellT -= dt;
    if (st.shellT <= 0) {
      spawnShell(fx);
      if (prog > 0.7 && rnd() < 0.45) spawnShell(fx);
      st.shellT = lerp(1.7, 0.75, prog) * (1 + st.fails * 0.22) * (0.7 + rnd() * 0.6);
    }
    for (const s of st.shells) s.fuse -= dt;
    for (const s of st.shells.filter((s) => s.fuse <= 0)) explode(s, fx);
    st.shells = st.shells.filter((s) => s.fuse > 0);

    if (p.hp <= 0) {
      st.reason = '포화 속에 쓰러졌다. 명령은 전해지지 못했다.';
      return 'lose';
    }
    if (st.time >= st.limit) {
      st.reason = '2차 공격의 호루라기가 울렸다. 너무 늦었다.';
      return 'lose';
    }
    if (p.x >= GOAL) return 'win';
    return 'play';
  },

  draw(g: Ctx, t: number) {
    const cam = Math.round(st.camX);
    const prog = progress();
    // 새벽 하늘: 진행할수록 밝아진다
    sky(g, 'rundawn', [[0, '#39404f'], [0.45, '#8c7a78'], [0.8, '#d69a6a'], [1, '#e7b27c']], 110);
    g.globalAlpha = prog * 0.35;
    R(g, 0, 0, W, 110, '#f0c890');
    g.globalAlpha = 1;
    // 먼 포격 섬광
    for (const f of st.far) {
      const x = f.x - cam * 0.4;
      if (f.t < 0.15) disc(g, x, 92, 10, '#ffd28a');
      smoke(g, x, 94, f.t * 3, Math.floor(f.x), '#4a4240', 0.8, 1);
    }
    ridge(g, cam, 0.2, 98, 10, 0.02, '#4d4545', 21);
    // 적 참호선 (먼 곳)
    for (let i = 0; i < 30; i++) {
      const x = ((i * 37 - cam * 0.5) % 420 + 420) % 420 - 50;
      R(g, x, 96, 1, 5, '#2b2525');
      line(g, x, 98, x + 10, 99, '#2b2525');
    }
    // 진흙 들판
    const mud = mudStrip('run2', WORLD + W, BOT - TOP + 22, 99, ['#3b332c', '#29231e', '#4d443b']);
    g.drawImage(mud, -cam, TOP - 6);
    // 포탄 구덩이
    for (const c of st.craters) {
      const x = c.x - cam;
      if (x < -20 || x > W + 20) continue;
      disc(g, x, c.y, c.r + 2, '#5c4a37', 0.45);
      disc(g, x, c.y, c.r, '#231b14', 0.45);
    }
    // 결승점: 데번셔 2대대 지휘 참호
    const gx = GOAL - cam;
    if (gx < W + 60) {
      R(g, gx + 6, TOP - 6, 60, BOT - TOP + 16, '#2a2018');
      for (let y = TOP - 4; y < BOT + 8; y += 5) sandbags(g, gx, gx + 10, y + 5, 1, y);
      line(g, gx + 20, TOP - 30, gx + 20, TOP + 10, '#3b2e22');
      R(g, gx + 21, TOP - 30, 12, 7, '#8f2d25');
      soldier(g, gx + 32, BOT - 20, { side: 'officer', face: -1, pack: false });
      text(g, '2ND DEVONS', gx + 20, TOP - 42, '#e8dcc0', 1, 0.5, '#000');
    }

    // 포탄 조준 표시 (지면)
    for (const s of st.shells) {
      const x = s.x - cam;
      const k = 1 - s.fuse / s.total;
      const r = 4 + k * 10;
      g.globalAlpha = 0.25 + k * 0.45;
      disc(g, x, s.y, r, '#140c08', 0.45);
      g.globalAlpha = 1;
      if (k > 0.45 && Math.floor(t * 14) % 2 === 0) {
        R(g, x - 3, s.y, 7, 1, '#e0442c');
        R(g, x, s.y - 2, 1, 5, '#e0442c');
      }
      if (s.fuse < 0.22) line(g, x + 8, s.y - 80 + (0.22 - s.fuse) * 350, x + 6, s.y - 70 + (0.22 - s.fuse) * 350, '#e7ddc9');
    }

    // y 순서대로 그린다
    type D = { y: number; f: () => void };
    const list: D[] = [];
    for (const r of st.runners) {
      const x = r.x - cam;
      if (x < -20 || x > W + 20) continue;
      if (r.down >= 0) list.push({ y: r.y, f: () => soldier(g, x, r.y, { pose: 'lie', face: r.seed % 2 ? 1 : -1, rifle: true }) });
      else {
        const a = clamp((r.y - (TOP - 36)) / 30, 0, 1);
        list.push({ y: r.y, f: () => soldierBack(g, x, r.y, r.phase, a) });
      }
    }
    const p = st.p;
    list.push({
      y: p.y,
      f: () => {
        if (p.inv > 0 && p.stun <= 0 && Math.floor(t * 16) % 2 === 0) return;
        const px = p.x - cam;
        const speed = Math.hypot(p.vx, p.vy);
        const pose = !st.started ? 'climb' : p.stun > 0 ? 'fall' : speed > 70 ? 'run' : speed > 8 ? 'walk' : 'stand';
        soldier(g, px, p.y, { pose, face: p.face, phase: p.phase, mark: true, bare: true, outline: '#f1dfa8', outlineAlpha: 0.7 });
        // 스코필드 표시
        if (st.started && p.stun <= 0) {
          P(g, px, p.y - 25, '#f2e3b3');
          R(g, px - 1, p.y - 27, 3, 1, '#f2e3b3');
        }
      },
    });
    for (const b of st.booms) list.push({ y: b.y + 0.5, f: () => blast(g, b.x - cam, b.y, b.t, b.seed, b.size) });
    list.sort((a, b) => a.y - b.y);
    list.forEach((d) => d.f());

    // 아군 참호 (전경)
    const fo = -Math.round(cam * 1.15);
    R(g, 0, BOT + 6, W, H - BOT - 6, '#1a140f');
    sandbags(g, fo % 8 - 8, W + 8, H + 2, 2, 7);
    // 전장을 가로질러 흘러가는 포연
    for (let i = 0; i < 7; i++) {
      const x = ((i * 83 - cam * 0.9 - t * (6 + i)) % 440 + 440) % 440 - 60;
      const y = TOP + 6 + ((i * 37) % (BOT - TOP));
      g.globalAlpha = 0.16;
      disc(g, x, y - 10, 22 + (i % 3) * 6, '#8f8577', 0.5);
      disc(g, x + 18, y - 14, 16, '#a39889', 0.5);
      g.globalAlpha = 1;
    }
    // 먼지 안개
    haze(g, '#b8a089', 0.08);
    if (st.hitFlash > 0) haze(g, '#8f1f18', st.hitFlash * 0.35);

    drawHud(g, t);
  },

  status() {
    return {
      time: st.time,
      limit: st.limit,
      progress: progress(),
      hp: st.p.hp,
      maxHp: 3,
      stamina: st.p.stamina,
      reason: st.reason,
      started: st.started,
    };
  },
};

function drawHud(g: Ctx, t: number): void {
  // 체력 (심장)
  for (let i = 0; i < 3; i++) {
    const x = 8 + i * 10, y = 8;
    const on = i < st.p.hp;
    const c = on ? '#c63a2e' : '#3b2a26';
    R(g, x, y + 1, 3, 3, c); R(g, x + 4, y + 1, 3, 3, c);
    R(g, x, y + 2, 7, 2, c); R(g, x + 1, y + 4, 5, 1, c); R(g, x + 2, y + 5, 3, 1, c); P(g, x + 3, y + 6, c);
    if (on) P(g, x + 1, y + 2, '#f08c7a');
  }
  // 체력(스태미나) 막대
  R(g, 8, 20, 32, 3, '#1a1512');
  R(g, 8, 20, Math.round(32 * st.p.stamina), 3, st.p.stamina > 0.25 ? '#d9c38a' : '#b5553a');
  // 진행 막대
  const bx = 70, bw = 125;
  R(g, bx, 10, bw, 2, '#1a1512');
  R(g, bx, 10, Math.round(bw * progress()), 2, '#d9c38a');
  R(g, bx + bw - 1, 6, 2, 8, '#8f2d25');
  const mx = bx + Math.round(bw * progress());
  R(g, mx - 1, 7, 3, 3, '#f2e3b3');
  text(g, 'MACKENZIE', bx + bw, 16, '#d9c38a', 1, 1, '#000');
  // 남은 시간
  const left = Math.max(0, st.limit - st.time);
  const m = Math.floor(left / 60), s = Math.floor(left % 60);
  const str = `${m}:${String(s).padStart(2, '0')}`;
  const warn = left < 15 && Math.floor(t * 4) % 2 === 0;
  text(g, str, bx, 16, warn ? '#e0442c' : '#f2e3b3', 2, 0, '#000');
}
