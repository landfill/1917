// 연출가: 장면 순서, 전환, 자막, 입력, 후처리
import './style.css';
import { W, H, makeCanvas, R, clamp, ease, text, hash } from './core/gfx';
import { audio } from './core/audio';
import { title } from './scenes/title';
import { sceneTree, sceneOrders, sceneTrenches, sceneNoMansLand, sceneGermanTrench, sceneFarm, sceneBlake } from './scenes/story1';
import { sceneBridge, sceneEcoust, sceneCellar, sceneRiver, sceneForest, sceneDelivery, sceneEnding } from './scenes/story2';
import { sceneRun } from './scenes/run';
import type { Scene, Transition, FxApi, InputState, StoryScene } from './scenes/types';

const SCENES: Scene[] = [
  sceneTree, sceneOrders, sceneTrenches, sceneNoMansLand, sceneGermanTrench,
  sceneFarm, sceneBlake, sceneBridge, sceneEcoust, sceneCellar,
  sceneRiver, sceneForest, sceneRun, sceneDelivery, sceneEnding,
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

const LETTER = '내일 새벽으로 예정된 공격을 즉시 중지할 것.\n적은 퇴각한 것이 아니다. 우리를 기다리고 있다.\n이 명령이 새벽 전에 닿지 않으면 1,600명을 잃는다.';

// ── DOM ────────────────────────────────────────────────
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const screen = $<HTMLCanvasElement>('screen');
const sg = screen.getContext('2d')!;
sg.imageSmoothingEnabled = false;
const ui = {
  stage: $('stage'),
  hud: $('hud'),
  hudNum: $('hudNum'),
  hudTitle: $('hudTitle'),
  hudEn: $('hudEn'),
  hudClock: $('hudClock'),
  hudRail: $('hudRail'),
  caption: $('caption'),
  capWho: $('capWho'),
  capText: $('capText'),
  titleUi: $('titleUi'),
  letter: $('letter'),
  letterBody: $('letterBody'),
  fail: $('failPanel'),
  failReason: $('failReason'),
  failNote: $('failNote'),
  end: $('endPanel'),
  chapters: $('chapterPanel'),
  chapterList: $('chapterList'),
  gameIntro: $('gameIntro'),
  mute: $('btnMute'),
  joy: $('joy'),
  joyKnob: $('joyKnob'),
  sprint: $('sprintZone'),
};
for (let i = 0; i < 15; i++) ui.hudRail.appendChild(document.createElement('span'));

// ── 버퍼 ───────────────────────────────────────────────
const bufA = makeCanvas();
const bufB = makeCanvas();
const bufC = makeCanvas();
const vignette = (() => {
  const m = makeCanvas();
  const grd = m.g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.55)');
  m.g.fillStyle = grd;
  m.g.fillRect(0, 0, W, H);
  return m.c;
})();

// ── 상태 ───────────────────────────────────────────────
type Mode = 'title' | 'letter' | 'play' | 'gameover' | 'end';
interface Playing { idx: number; t: number; cue: number; line: number; lineAt: number }
interface Trans { kind: Transition | 'fromTitle'; p: number; dur: number; prev: Playing | null; startAt: number }

let mode: Mode = 'title';
let cur: Playing = { idx: 0, t: 0, cue: 0, line: -1, lineAt: 0 };
let trans: Trans | null = null;
let clock = 0;
let fails = 0;
let letterAt = 0;
let shake = 0;
let flash = 0;
let flashColor = '#ffffff';
let gameResult: 'play' | 'win' | 'lose' = 'play';
let holding = false;

const fx: FxApi = {
  audio,
  shake: (n) => { shake = Math.max(shake, n); },
  flash: (n, c = '#ffffff') => { flash = Math.max(flash, n); flashColor = c; },
};

const DUR: Record<Transition, number> = { pan: 1.5, tilt: 1.8, flash: 1.3, cut: 2.6, drain: 3.0, flare: 1.6, water: 2.0, iris: 1.8, fade: 1.8 };
/** 새 장면의 시간이 흐르기 시작하는 전환 진행도 */
const START: Record<Transition, number> = { pan: 0, tilt: 0, flash: 0.5, cut: 0.94, drain: 0.6, flare: 0.5, water: 0.3, iris: 0.5, fade: 0.5 };

// ── 입력 ───────────────────────────────────────────────
const keys = new Set<string>();
const touch = { id: -1, ax: 0, ay: 0, x: 0, y: 0, sprintId: -1 };

function input(): InputState {
  let x = 0, y = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
  if (touch.id >= 0) {
    const dx = touch.x - touch.ax, dy = touch.y - touch.ay;
    const len = Math.hypot(dx, dy);
    if (len > 6) {
      const k = Math.min(1, len / 45);
      x = (dx / len) * k;
      y = (dy / len) * k;
    }
  }
  const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Space') || touch.sprintId >= 0;
  return { x, y, sprint };
}

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLButtonElement && (e.code === 'Space' || e.code === 'Enter')) return;
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  audio.init();
  if (e.code === 'KeyM') toggleMute();
  if (e.repeat) return;
  if (mode === 'title' && e.code === 'Space') holding = true;
  else if (mode === 'letter' && (e.code === 'Space' || e.code === 'Enter')) beginJourney();
  else if (mode === 'play' && isStory() && (e.code === 'Space' || e.code === 'Enter')) advance();
  else if (mode === 'play' && isStory() && (e.code === 'KeyN' || e.code === 'ArrowRight')) nextScene();
  else if (mode === 'gameover' && (e.code === 'Enter' || e.code === 'KeyR')) retry();
});
window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'Space') holding = false;
});
window.addEventListener('blur', () => { keys.clear(); holding = false; });

const isPanelTarget = (e: Event) => (e.target as HTMLElement).closest('button, .panel') !== null;

document.addEventListener('pointerdown', (e) => {
  if (isPanelTarget(e)) return;
  audio.init();
  if (mode === 'title') { holding = true; return; }
  if (mode === 'letter') { beginJourney(); return; }
  if (mode !== 'play') return;
  const s = SCENES[cur.idx];
  if (s.kind === 'story') { advance(); return; }
  // 게임: 왼쪽은 이동 스틱, 오른쪽은 질주
  if (e.clientX < window.innerWidth * 0.55) {
    if (touch.id < 0) {
      touch.id = e.pointerId;
      touch.ax = touch.x = e.clientX;
      touch.ay = touch.y = e.clientY;
      ui.joy.hidden = false;
      ui.joy.style.left = e.clientX + 'px';
      ui.joy.style.top = e.clientY + 'px';
      ui.joyKnob.style.transform = '';
    }
  } else if (touch.sprintId < 0) {
    touch.sprintId = e.pointerId;
    ui.sprint.classList.add('on');
  }
});
document.addEventListener('pointermove', (e) => {
  if (e.pointerId === touch.id) {
    touch.x = e.clientX;
    touch.y = e.clientY;
    let dx = touch.x - touch.ax, dy = touch.y - touch.ay;
    const len = Math.hypot(dx, dy);
    if (len > 45) { dx = (dx / len) * 45; dy = (dy / len) * 45; }
    ui.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
});
const release = (e: PointerEvent) => {
  if (mode === 'title') holding = false;
  if (e.pointerId === touch.id) { touch.id = -1; ui.joy.hidden = true; }
  if (e.pointerId === touch.sprintId) { touch.sprintId = -1; ui.sprint.classList.remove('on'); }
};
document.addEventListener('pointerup', release);
document.addEventListener('pointercancel', release);
document.addEventListener('contextmenu', (e) => e.preventDefault());

function toggleMute(): void {
  audio.setMuted(!audio.muted);
  ui.mute.classList.toggle('off', audio.muted);
  ui.mute.setAttribute('aria-label', audio.muted ? '소리 켜기' : '소리 끄기');
}
ui.mute.addEventListener('click', () => { audio.init(); toggleMute(); });

$('btnRetry').addEventListener('click', retry);
$('btnSkipRun').addEventListener('click', () => { ui.fail.hidden = true; mode = 'play'; nextScene(); });
$('btnAgain').addEventListener('click', () => { ui.end.hidden = true; toTitle(); });
$('btnRunAgain').addEventListener('click', () => { ui.end.hidden = true; jumpTo(SCENES.indexOf(sceneRun)); });
$('btnChapters').addEventListener('click', () => { audio.init(); ui.chapters.hidden = false; });
$('btnCloseChapters').addEventListener('click', () => { ui.chapters.hidden = true; });
SCENES.forEach((s, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span class="n">${ROMAN[i]}</span><span>${s.title}</span>${s.kind === 'game' ? '<span class="game">게임</span>' : ''}`;
  b.addEventListener('click', () => { ui.chapters.hidden = true; jumpTo(i); });
  li.appendChild(b);
  ui.chapterList.appendChild(li);
});

// ── 흐름 ───────────────────────────────────────────────
function isStory(): boolean {
  return SCENES[cur.idx].kind === 'story';
}

function toTitle(): void {
  mode = 'title';
  title.reset();
  trans = null;
  ui.titleUi.hidden = false;
  ui.hud.hidden = true;
  ui.letter.hidden = true;
  ui.gameIntro.hidden = true;
  setCaption(null);
  audio.setMood('title');
}

let typeTimer = 0;
function showLetter(): void {
  mode = 'letter';
  letterAt = clock;
  ui.titleUi.hidden = true;
  ui.letter.hidden = false;
  ui.letterBody.textContent = '';
  let i = 0;
  window.clearInterval(typeTimer);
  typeTimer = window.setInterval(() => {
    i++;
    ui.letterBody.textContent = LETTER.slice(0, i);
    if (i % 3 === 0 && LETTER[i] !== ' ') audio.clockTick();
    if (i >= LETTER.length) window.clearInterval(typeTimer);
  }, 42);
}

function beginJourney(): void {
  if (mode !== 'letter' || clock - letterAt < 0.6) return;
  window.clearInterval(typeTimer);
  ui.letter.hidden = true;
  audio.whistle(1.1, 0.1);
  startScene(0, 'fromTitle');
}

function jumpTo(i: number): void {
  ui.titleUi.hidden = true;
  ui.letter.hidden = true;
  ui.fail.hidden = true;
  ui.end.hidden = true;
  mode = 'play';
  startScene(i, 'fade', true);
}

function startScene(i: number, kindOverride?: Transition | 'fromTitle', fresh = false): void {
  const prev = fresh ? null : mode === 'play' && trans === null ? { ...cur } : trans?.prev ?? null;
  const s = SCENES[i];
  const kind = kindOverride ?? s.enter;
  cur = { idx: i, t: 0, cue: 0, line: -1, lineAt: 0 };
  mode = 'play';
  trans = { kind, p: 0, dur: kind === 'fromTitle' ? 2.2 : DUR[kind], prev: kind === 'fromTitle' ? null : prev, startAt: kind === 'fromTitle' ? 0.2 : START[kind] };
  setCaption(null);
  if (kind === 'cut') audio.setMood('none', 0.05);
  else audio.setMood(s.mood);
  if (s.kind === 'game') {
    fails = 0;
    s.reset(fx, fails);
    gameResult = 'play';
  }
  updateHud();
}

function nextScene(): void {
  if (trans) return;
  if (cur.idx + 1 >= SCENES.length) { finish(); return; }
  startScene(cur.idx + 1);
}

function finish(): void {
  mode = 'end';
  setCaption(null);
  ui.hud.hidden = true;
  ui.end.hidden = false;
  audio.setMood('title', 4);
}

/** 클릭: 다음 자막으로, 자막이 끝났으면 다음 장면으로 */
function advance(): void {
  if (trans) return;
  const s = SCENES[cur.idx] as StoryScene;
  const nextLine = s.lines.find((l) => l.t > cur.t + 0.05);
  if (nextLine) {
    cur.t = nextLine.t;
    while (cur.cue < s.cues.length && s.cues[cur.cue].t < cur.t) cur.cue++;
  } else nextScene();
}

function retry(): void {
  if (mode !== 'gameover') return;
  ui.fail.hidden = true;
  fails++;
  sceneRun.reset(fx, fails);
  gameResult = 'play';
  cur.t = 0;
  mode = 'play';
  audio.setMood('none', 0.3);
  setTimeout(() => audio.setMood('run'), 400);
}

function updateHud(): void {
  const s = SCENES[cur.idx];
  ui.hud.hidden = false;
  ui.hudNum.textContent = ROMAN[cur.idx];
  ui.hudTitle.textContent = s.title;
  ui.hudEn.textContent = s.en;
  ui.hudClock.textContent = s.clock;
  [...ui.hudRail.children].forEach((el, i) => {
    el.className = i < cur.idx ? 'done' : i === cur.idx ? 'now' : '';
  });
}

function setCaption(line: { who?: string; text: string } | null): void {
  if (!line) {
    ui.caption.classList.remove('on');
    return;
  }
  ui.capWho.textContent = line.who ?? '';
  ui.capText.textContent = '';
  ui.caption.classList.add('on');
}

// ── 갱신 ───────────────────────────────────────────────
function update(dt: number): void {
  clock += dt;
  shake = Math.max(0, shake - dt * 18);
  flash = Math.max(0, flash - dt * 2.2);

  if (mode === 'title') {
    if (title.update(dt, clock, holding, audio)) {
      holding = false;
      setTimeout(() => { if (mode === 'title') showLetter(); }, 1500);
    }
    return;
  }
  if (mode !== 'play' && mode !== 'gameover') return;

  if (trans) {
    trans.p += dt / trans.dur;
    if (trans.prev) trans.prev.t += dt;
    if (trans.kind === 'cut' && trans.p >= START.cut) audio.setMood(SCENES[cur.idx].mood, 0.3);
    if (trans.p >= 1) trans = null;
  }
  const s = SCENES[cur.idx];
  const running = !trans || trans.p >= trans.startAt;

  if (s.kind === 'story') {
    if (!running) return;
    cur.t += dt;
    while (cur.cue < s.cues.length && s.cues[cur.cue].t <= cur.t) {
      s.cues[cur.cue].fn(fx);
      cur.cue++;
    }
    // 자막
    let li = -1;
    for (let i = 0; i < s.lines.length; i++) if (s.lines[i].t <= cur.t) li = i;
    if (li !== cur.line) {
      cur.line = li;
      cur.lineAt = cur.t;
      setCaption(li >= 0 ? s.lines[li] : null);
    }
    if (li >= 0) {
      const full = s.lines[li].text;
      const n = Math.min(full.length, Math.floor((cur.t - cur.lineAt) * 34) + 1);
      if (ui.capText.textContent!.length !== n) ui.capText.textContent = full.slice(0, n);
    }
    if (cur.t > s.duration - 0.6) ui.caption.classList.remove('on');
    if (cur.t >= s.duration) nextScene();
  } else {
    if (!running) return;
    cur.t += dt;
    const st = s.status();
    ui.gameIntro.hidden = st.started || mode !== 'play';
    ui.hud.classList.toggle('dim', true);
    ui.sprint.hidden = !(matchMedia('(pointer: coarse)').matches && mode === 'play');
    if (mode === 'play' && gameResult === 'play') {
      gameResult = s.update(dt, input(), fx);
      if (gameResult === 'lose') {
        mode = 'gameover';
        ui.fail.hidden = false;
        ui.failReason.textContent = st.reason || s.status().reason;
        ui.failNote.textContent = fails >= 1 ? '다시 달릴 때마다 시간이 조금 더 주어지고 포격이 약해집니다.' : 'Shift(모바일은 오른쪽 버튼)로 전력 질주할 수 있습니다. 포탄이 떨어질 자리에 붉은 표시가 깜박입니다.';
        audio.setMood('grief', 1.2);
        ui.sprint.hidden = true;
      } else if (gameResult === 'win') {
        audio.whistle(1.5, 0.12);
        ui.sprint.hidden = true;
        ui.hud.classList.remove('dim');
        nextScene();
      }
    }
  }
  if (s.kind === 'story') ui.hud.classList.remove('dim');
}

// ── 그리기 ─────────────────────────────────────────────
function drawScene(p: Playing, g: CanvasRenderingContext2D): void {
  const s = SCENES[p.idx];
  g.save();
  s.draw(g, Math.max(0, p.t));
  g.restore();
}

function desaturate(g: CanvasRenderingContext2D, a: number, darken = 0): void {
  if (a <= 0) return;
  g.globalCompositeOperation = 'saturation';
  g.globalAlpha = clamp(a, 0, 1);
  R(g, 0, 0, W, H, '#808080');
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = clamp(darken, 0, 1);
  R(g, 0, 0, W, H, '#000');
  g.globalAlpha = 1;
}

/** 전환 합성: A(이전) → B(다음), 결과는 out에 */
function compose(out: CanvasRenderingContext2D, kind: Trans['kind'], p: number, A: HTMLCanvasElement | null, B: HTMLCanvasElement): void {
  R(out, 0, 0, W, H, '#000');
  const e = ease(p);
  switch (kind) {
    case 'fromTitle': {
      // 봉인이 뜯긴 어둠에서 첫 장면이 밝아온다
      out.drawImage(B, 0, Math.round((1 - e) * -40));
      out.globalAlpha = 1 - e;
      R(out, 0, 0, W, H, '#000');
      out.globalAlpha = 1;
      return;
    }
    case 'pan':
    case 'tilt': {
      const horiz = kind === 'pan';
      const d = (horiz ? W : H) * e;
      const blur = Math.sin(p * Math.PI);
      const draw = (img: HTMLCanvasElement | null, off: number) => {
        if (!img) return;
        const x = horiz ? off : 0, y = horiz ? 0 : off;
        out.drawImage(img, Math.round(x), Math.round(y));
        if (blur > 0.1) {
          out.globalAlpha = 0.35 * blur;
          out.drawImage(img, Math.round(x + (horiz ? 6 : 0)), Math.round(y + (horiz ? 0 : 6)));
          out.drawImage(img, Math.round(x + (horiz ? 12 : 0)), Math.round(y + (horiz ? 0 : 12)));
          out.globalAlpha = 1;
        }
      };
      draw(A, -d);
      draw(B, (horiz ? W : H) - d);
      return;
    }
    case 'flash': {
      if (p < 0.5) { if (A) out.drawImage(A, 0, 0); out.globalAlpha = p * 2; }
      else { out.drawImage(B, 0, 0); out.globalAlpha = (1 - p) * 2; }
      R(out, 0, 0, W, H, '#fffaf0');
      out.globalAlpha = 1;
      return;
    }
    case 'cut': {
      // 암전. 단 한 번뿐인 컷
      if (p >= START.cut) out.drawImage(B, 0, 0);
      return;
    }
    case 'drain': {
      if (A) {
        out.drawImage(A, 0, 0);
        desaturate(out, p / 0.6, (p / 0.6) * 0.5);
      }
      if (p > 0.6) {
        out.globalAlpha = (p - 0.6) / 0.4;
        out.drawImage(B, 0, 0);
        out.globalAlpha = 1;
      }
      return;
    }
    case 'flare': {
      if (p < 0.5 && A) out.drawImage(A, 0, 0);
      else out.drawImage(B, 0, 0);
      const a = Math.sin(p * Math.PI);
      const grd = out.createRadialGradient(W * 0.6, H * 0.3, 0, W * 0.6, H * 0.3, W);
      grd.addColorStop(0, `rgba(255,220,150,${a})`);
      grd.addColorStop(0.5, `rgba(230,110,40,${a * 0.8})`);
      grd.addColorStop(1, `rgba(90,20,5,${a * 0.6})`);
      out.fillStyle = grd;
      out.fillRect(0, 0, W, H);
      return;
    }
    case 'water': {
      const amp = Math.sin(p * Math.PI) * 10;
      const src = p < 0.5 && A ? A : B;
      for (let y = 0; y < H; y++) {
        const dx = Math.round(Math.sin(y * 0.18 + p * 20) * amp);
        out.drawImage(src, 0, y, W, 1, dx, y, W, 1);
      }
      out.globalAlpha = Math.sin(p * Math.PI) * 0.35;
      R(out, 0, 0, W, H, '#8fb0c0');
      out.globalAlpha = 1;
      return;
    }
    case 'iris': {
      const img = p < 0.5 ? A : B;
      const r = p < 0.5 ? (1 - p * 2) * 200 : (p - 0.5) * 2 * 200;
      if (img) {
        out.save();
        out.beginPath();
        out.arc(W / 2, H / 2, Math.max(0.1, r), 0, Math.PI * 2);
        out.clip();
        out.drawImage(img, 0, 0);
        out.restore();
      }
      return;
    }
    case 'fade': {
      if (p < 0.5) { if (A) out.drawImage(A, 0, 0); out.globalAlpha = p * 2; }
      else { out.drawImage(B, 0, 0); out.globalAlpha = (1 - p) * 2; }
      R(out, 0, 0, W, H, '#000');
      out.globalAlpha = 1;
      return;
    }
  }
}

function render(): void {
  const g = bufC.g;
  R(g, 0, 0, W, H, '#000');
  if (mode === 'title' || mode === 'letter') {
    title.draw(g, clock);
    if (mode === 'letter') {
      g.globalAlpha = 0.55;
      R(g, 0, 0, W, H, '#000');
      g.globalAlpha = 1;
    }
  } else if (mode === 'end') {
    drawScene({ idx: SCENES.length - 1, t: 17.5, cue: 0, line: 0, lineAt: 0 }, g);
    g.globalAlpha = 0.55;
    R(g, 0, 0, W, H, '#000');
    g.globalAlpha = 1;
    text(g, '1917', W / 2 + 1, 25, '#000', 4, 0.5);
    text(g, '1917', W / 2, 24, '#eadcbc', 4, 0.5);
  } else {
    drawScene(cur, bufB.g);
    if (trans) {
      let A: HTMLCanvasElement | null = null;
      if (trans.prev) {
        drawScene(trans.prev, bufA.g);
        A = bufA.c;
      } else if (trans.kind === 'fromTitle') A = null;
      compose(g, trans.kind, clamp(trans.p, 0, 1), A, bufB.c);
    } else g.drawImage(bufB.c, 0, 0);
  }

  // 최종 합성 + 후처리
  R(sg, 0, 0, W, H, '#000');
  const sx = shake > 0 ? Math.round((Math.random() - 0.5) * shake) : 0;
  const sy = shake > 0 ? Math.round((Math.random() - 0.5) * shake) : 0;
  sg.drawImage(bufC.c, sx, sy);
  if (flash > 0) {
    sg.globalAlpha = clamp(flash, 0, 1);
    R(sg, 0, 0, W, H, flashColor);
    sg.globalAlpha = 1;
  }
  sg.drawImage(vignette, 0, 0);
  // 필름 그레인
  const seed = Math.floor(clock * 30);
  for (let i = 0; i < 140; i++) {
    const h1 = hash(seed * 131 + i);
    const h2 = hash(seed * 17 + i * 7);
    sg.globalAlpha = 0.05 + hash(i + seed) * 0.07;
    sg.fillStyle = i % 2 ? '#fff' : '#000';
    sg.fillRect(Math.floor(h1 * W), Math.floor(h2 * H), 1, 1);
  }
  sg.globalAlpha = 1;
  // 이야기 장면에는 얇은 레터박스
  if (mode === 'play' && SCENES[cur.idx].kind === 'story') {
    R(sg, 0, 0, W, 10, '#000');
    R(sg, 0, H - 16, W, 16, '#000');
  }
}

// ── 루프 ───────────────────────────────────────────────
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

toTitle();
requestAnimationFrame(frame);

// 테스트·디버그용 훅: 특정 장면의 특정 시각으로 바로 이동
(window as unknown as { __1917: unknown }).__1917 = {
  jump(i: number, t = 0) {
    jumpTo(i);
    trans = null;
    cur.t = t;
    const s = SCENES[i];
    if (s.kind === 'story') while (cur.cue < s.cues.length && s.cues[cur.cue].t < t) cur.cue++;
  },
  hold() { holding = true; },
  state: () => ({ mode, idx: cur.idx, t: cur.t, trans: trans?.kind ?? null }),
};
