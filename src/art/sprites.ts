// 인물·사물 스프라이트. 비트맵 없이 사각형 조합으로 그린다.
import { Ctx, R, P, disc, line, rng, hash } from '../core/gfx';

export const PAL = {
  ink: '#0d0c0b',
  skin: '#c99a78',
  skinD: '#8f6a52',
  khaki: '#a08752',
  khakiD: '#6e5a37',
  khakiL: '#bea46c',
  helmet: '#737050',
  helmetL: '#98946a',
  putty: '#5e5036',
  boot: '#2a211a',
  grey: '#6d7266',
  greyD: '#4f544b',
  stahl: '#555a55',
  officer: '#6b5b3c',
  red: '#a3322b',
  rifle: '#3b2c1e',
  steel: '#8d918f',
  mud: '#4a3b2c',
  mudD: '#34291f',
  mudL: '#6a5641',
  blossom: '#f2c6cf',
  blossomD: '#d893a3',
  fire: '#ff9a2e',
  fireL: '#ffd76a',
  fireD: '#c4451c',
};

export type Pose = 'stand' | 'walk' | 'run' | 'sit' | 'lie' | 'crouch' | 'aim' | 'fall' | 'climb' | 'wade' | 'kneel';

export interface SoldierOpt {
  face?: 1 | -1;
  pose?: Pose;
  /** 걷기 주기 위상 (초 단위 시간 × 속도) */
  phase?: number;
  side?: 'brit' | 'german' | 'officer' | 'general';
  rifle?: boolean;
  pack?: boolean;
  /** 전체를 한 색으로 (실루엣) */
  sil?: string;
  /** 인물 구분용 표식 — 스코필드는 소매에 흰 띠 */
  mark?: boolean;
  bare?: boolean;
  /** 외곽선 색. false면 외곽선 없음 (기본: 짙은 갈색) */
  outline?: string | false;
  /** 발밑 그림자 (기본: 켜짐) */
  shadow?: boolean;
}

/** 배경과 인물을 떼어 놓는 1px 외곽선 색 */
export const OUTLINE = '#140f0a';
const RING: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function groundShadow(g: Ctx, x: number, y: number, r = 5): void {
  g.save();
  g.globalAlpha *= 0.35;
  disc(g, x, y, r, '#000000', 0.35);
  g.restore();
}

/**
 * 병사 한 명. (x, y)는 발밑 중앙. 키 약 20px.
 */
export function soldier(g: Ctx, x: number, y: number, o: SoldierOpt = {}): void {
  if (!o.sil && o.outline !== false) {
    const p = o.pose ?? 'stand';
    if (o.shadow !== false && p !== 'lie' && p !== 'fall' && p !== 'sit') groundShadow(g, x, y);
    const sil = o.outline ?? OUTLINE;
    for (const [dx, dy] of RING) soldier(g, x + dx, y + dy, { ...o, sil, outline: false });
  }
  const f = o.face ?? 1;
  const pose = o.pose ?? 'stand';
  const side = o.side ?? 'brit';
  const s = o.sil;
  const cUni = s ?? (side === 'german' ? PAL.grey : side === 'brit' ? PAL.khaki : PAL.officer);
  const cUniD = s ?? (side === 'german' ? PAL.greyD : PAL.khakiD);
  const cHelm = s ?? (side === 'german' ? PAL.stahl : PAL.helmet);
  const cHelmL = s ?? (side === 'german' ? '#6d736d' : PAL.helmetL);
  const cSkin = s ?? PAL.skin;
  const cLeg = s ?? (side === 'german' ? PAL.greyD : PAL.putty);
  const cBoot = s ?? PAL.boot;
  x = Math.round(x);
  y = Math.round(y);
  // 좌우 반전용 사각형
  const r = (dx: number, dy: number, w: number, h: number, c: string) => {
    const xx = f === 1 ? x + dx : x - dx - w + 1;
    R(g, xx, y + dy, w, h, c);
  };
  const ph = o.phase ?? 0;

  if (pose === 'lie' || pose === 'fall') {
    // 누운 자세: 머리가 앞쪽
    const k = pose === 'fall' ? 1 : 0;
    r(-9, -4 - k, 12, 4, cUni);
    r(-9, -2 - k, 12, 1, cUniD);
    r(-13, -3 - k, 4, 3, cLeg);
    r(-14, -3 - k, 1, 3, cBoot);
    r(3, -5 - k, 3, 3, cSkin);
    r(4, -6 - k, 4, 2, cHelm);
    r(3, -4 - k, 6, 1, cHelm);
    if (o.rifle) line(g, x - 8 * f, y - 1, x + 6 * f, y - 1, s ?? PAL.rifle);
    return;
  }

  if (pose === 'sit') {
    // 나무에 기대 앉은 자세
    r(-3, -13, 5, 7, cUni);
    r(-3, -7, 5, 1, cUniD);
    r(-1, -6, 9, 3, cUni); // 허벅지
    r(6, -6, 2, 5, cLeg);
    r(6, -1, 3, 1, cBoot);
    r(-2, -16, 4, 3, cSkin);
    if (!o.bare) {
      r(-4, -17, 8, 1, cHelm);
      r(-2, -19, 5, 2, cHelm);
    } else {
      r(-2, -17, 4, 2, s ?? '#3a2a1c');
    }
    r(1, -11, 4, 2, cUniD); // 팔
    if (o.mark) r(0, -11, 1, 2, s ?? '#d8d0b8');
    return;
  }

  let lean = 0;
  let la = 0, lb = 0, arm = 0, bob = 0;
  if (pose === 'walk' || pose === 'wade') {
    const sw = Math.sin(ph * Math.PI * 2);
    la = Math.round(sw * 2);
    lb = -la;
    arm = Math.round(-sw);
    bob = Math.abs(Math.round(Math.cos(ph * Math.PI * 2)));
  } else if (pose === 'run') {
    const sw = Math.sin(ph * Math.PI * 2);
    la = Math.round(sw * 3);
    lb = -la;
    arm = Math.round(-sw * 2);
    bob = Math.abs(Math.round(Math.cos(ph * Math.PI * 2) * 1.4));
    lean = 1;
  } else if (pose === 'crouch' || pose === 'kneel' || pose === 'aim') {
    bob = -5;
  } else if (pose === 'climb') {
    la = -2;
    lb = 1;
    lean = 2;
  }
  const by = -bob;

  // 다리
  if (pose === 'crouch' || pose === 'kneel' || pose === 'aim') {
    r(-2, -5, 5, 2, cUni);
    r(2, -3, 2, 3, cLeg);
    r(-3, -3, 3, 2, cLeg);
    r(2, -1, 3, 1, cBoot);
    r(-5, -1, 3, 1, cBoot);
  } else if (pose !== 'wade') {
    r(-2 + la, -8 + by + (bob ? 1 : 0), 2, 7, cLeg);
    r(-2 + la, -1 + by + (bob ? 1 : 0), 3, 1, cBoot);
    r(1 + lb, -8 + by + (bob ? 1 : 0), 2, 7, cLeg);
    r(1 + lb, -1 + by + (bob ? 1 : 0), 3, 1, cBoot);
    // 바지 윗부분
    r(-2, -9 + by, 5, 2, cUni);
  }
  // 몸통
  const tx = lean;
  r(-2 + tx, -15 + by, 5, 7, cUni);
  r(-2 + tx, -10 + by, 5, 1, cUniD); // 허리띠
  r(-2 + tx, -15 + by, 1, 7, cUniD);
  if (side === 'officer' || side === 'general') {
    r(1 + tx, -15 + by, 1, 1, s ?? PAL.red); // 깃 표장
    r(-2 + tx, -12 + by, 5, 1, s ?? '#5a4a30'); // 샘 브라운 벨트
  }
  // 배낭
  if (o.pack ?? side !== 'general') {
    r(-4 + tx, -15 + by, 2, 5, s ?? (side === 'german' ? '#4a4a3e' : '#6b5836'));
  }
  // 팔
  if (pose === 'aim') {
    r(1 + tx, -13 + by, 5, 2, cUniD);
    line(g, x + (tx + 2) * f, y - 13 + by, x + (tx + 12) * f, y - 14 + by, s ?? PAL.rifle);
  } else {
    r(0 + tx + arm, -14 + by, 2, 5, cUniD);
    r(0 + tx + arm, -9 + by, 2, 1, cSkin);
    if (o.mark) r(0 + tx + arm, -13 + by, 2, 1, s ?? '#d8d0b8');
  }
  // 소총 (어깨에 멘)
  if (o.rifle && pose !== 'aim') {
    line(g, x + (tx - 3) * f, y - 7 + by, x + (tx + 2) * f, y - 20 + by, s ?? PAL.rifle);
  }
  // 머리
  r(-1 + tx + (lean ? 1 : 0), -18 + by, 4, 3, cSkin);
  P(g, x + (tx + 2 + (lean ? 1 : 0)) * f - (f === -1 ? 0 : 0), y - 17 + by, s ?? PAL.ink);
  // 모자
  const hx = tx + (lean ? 1 : 0);
  if (o.bare) {
    r(-1 + hx, -19 + by, 4, 2, s ?? '#3a2a1c');
  } else if (side === 'german') {
    r(-2 + hx, -21 + by, 5, 3, cHelm);
    r(-3 + hx, -19 + by, 1, 3, cHelm);
    r(3 + hx, -19 + by, 1, 1, cHelm);
    r(-1 + hx, -21 + by, 3, 1, cHelmL);
  } else if (side === 'officer' || side === 'general') {
    r(-2 + hx, -20 + by, 6, 2, s ?? '#5a4b31');
    r(2 + hx, -18 + by, 3, 1, s ?? '#2c241a'); // 챙
    if (side === 'general') r(-1 + hx, -20 + by, 4, 1, s ?? PAL.red);
  } else {
    // 브로디 헬멧: 넓고 납작한 챙
    r(-4 + hx, -19 + by, 9, 1, cHelm);
    r(-2 + hx, -21 + by, 5, 2, cHelm);
    r(-1 + hx, -21 + by, 3, 1, cHelmL);
  }
}

/** 프랑스 여인과 아기 */
export function woman(g: Ctx, x: number, y: number, t: number, f: 1 | -1 = 1): void {
  const r = (dx: number, dy: number, w: number, h: number, c: string) => R(g, f === 1 ? x + dx : x - dx - w + 1, y + dy, w, h, c);
  r(-4, -10, 8, 10, '#3f3a46'); // 치마
  r(-3, -16, 6, 7, '#5a4f5e');
  r(-2, -20, 4, 4, PAL.skin);
  r(-3, -22, 6, 3, '#6d5a47'); // 머릿수건
  r(-3, -19, 1, 4, '#6d5a47');
  // 아기 (흰 포대기)
  const b = Math.round(Math.sin(t * 2) * 0.6);
  r(1, -14 + b, 5, 3, '#d9d2c3');
  r(4, -15 + b, 2, 2, PAL.skin);
}

/** 쥐 */
export function rat(g: Ctx, x: number, y: number, t: number, f: 1 | -1 = 1): void {
  const r = (dx: number, dy: number, w: number, h: number, c: string) => R(g, f === 1 ? x + dx : x - dx - w + 1, y + dy, w, h, c);
  const b = Math.round(Math.sin(t * 20));
  r(-2, -2, 4, 2, '#3e3530');
  r(2, -2, 1, 1, '#3e3530');
  r(-5, -1 + b * 0, 3, 1, '#6b5a50');
  r(-1 + b, 0, 1, 1, '#2a2320');
  r(1 - b, 0, 1, 1, '#2a2320');
}

/** 복엽기 (옆모습). 폭 약 26px */
export function plane(g: Ctx, x: number, y: number, t: number, f: 1 | -1 = 1, burning = 0, tilt = 0): void {
  const body = '#6a6a58', dark = '#3e3f34', wing = '#7f7d66';
  const r = (dx: number, dy: number, w: number, h: number, c: string) => R(g, f === 1 ? x + dx : x - dx - w + 1, y + dy + Math.round((dx / 12) * tilt), w, h, c);
  r(-12, -1, 22, 3, body);
  r(-12, 1, 22, 1, dark);
  r(-13, -4, 3, 4, body); // 꼬리
  r(-14, 0, 5, 1, dark);
  r(-4, -6, 12, 1, wing); // 윗날개
  r(-3, 3, 10, 1, wing); // 아랫날개
  r(0, -5, 1, 8, dark);
  r(5, -5, 1, 8, dark);
  r(-6, -2, 3, 1, '#b83a2c'); // 표식
  r(10, -1, 2, 3, '#2c2c24');
  // 프로펠러
  const pr = Math.floor(t * 30) % 2;
  r(12, pr ? -3 : 0, 1, pr ? 4 : 4, '#c0c0b0');
  if (burning > 0) {
    for (let i = 0; i < 6; i++) {
      const h = hash(Math.floor(t * 12) + i * 17);
      r(-10 + i * 3, -3 - Math.round(h * 4), 2, 2, h > 0.5 ? PAL.fire : PAL.fireL);
    }
  }
}

/** 군용 트럭 (옆모습). 폭 약 46px, 발밑 기준 */
export function truck(g: Ctx, x: number, y: number, t: number, moving = true): void {
  x = Math.round(x);
  y = Math.round(y);
  const bob = moving ? Math.round(Math.sin(t * 14) * 0.6) : 0;
  const canvas = '#6e6446', canvasD = '#544b33', cab = '#4e4a36';
  R(g, x - 22, y - 22 + bob, 30, 14, canvas);
  for (let i = 0; i < 5; i++) R(g, x - 21 + i * 6, y - 22 + bob, 1, 14, canvasD);
  R(g, x - 22, y - 23 + bob, 30, 1, canvasD);
  R(g, x + 8, y - 17 + bob, 12, 9, cab);
  R(g, x + 10, y - 16 + bob, 5, 4, '#26241c');
  R(g, x + 19, y - 12 + bob, 3, 4, '#3a3727');
  R(g, x - 24, y - 8 + bob, 46, 3, '#2f2c22');
  for (const wx of [-15, 13]) {
    disc(g, x + wx, y - 3, 3.4, '#1c1a16');
    const a = moving ? t * 10 : 0;
    P(g, x + wx + Math.round(Math.cos(a) * 2), y - 3 + Math.round(Math.sin(a) * 2), '#555');
  }
}

/** 나무 한 그루 — 재귀 가지, 캐시하지 않고 결정적 난수로 그린다 */
export function tree(g: Ctx, x: number, y: number, size: number, seed: number, trunk = '#2e2419', leaf: string | null = '#3f4a2c', leafL = '#56613a', sway = 0): void {
  const rnd = rng(seed);
  const tips: [number, number][] = [];
  const branch = (bx: number, by: number, ang: number, len: number, w: number, depth: number) => {
    const ex = bx + Math.cos(ang) * len + sway * (5 - depth) * 0.3;
    const ey = by + Math.sin(ang) * len;
    const steps = Math.ceil(len);
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const ww = Math.max(1, Math.round(w * (1 - k * 0.3)));
      R(g, bx + (ex - bx) * k - ww / 2, by + (ey - by) * k, ww, 1, trunk);
    }
    if (depth <= 0 || len < 3) { tips.push([ex, ey]); return; }
    const n = 2 + (rnd() < 0.35 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a = ang + (rnd() - 0.5) * 1.3 + (i - (n - 1) / 2) * 0.5;
      branch(ex, ey, a, len * (0.62 + rnd() * 0.18), w * 0.62, depth - 1);
    }
  };
  branch(x, y, -Math.PI / 2 + (rnd() - 0.5) * 0.15, size * 0.38, Math.max(2, size / 9), 4);
  if (leaf) {
    for (const [tx, ty] of tips) {
      const rr = size * 0.09 + rnd() * size * 0.05;
      disc(g, tx + sway * 0.6, ty, rr, leaf);
      if (rnd() < 0.7) disc(g, tx + sway * 0.6 - 1, ty - rr * 0.4, rr * 0.55, leafL);
    }
  }
}

/** 벚꽃 나무 */
export function cherryTree(g: Ctx, x: number, y: number, size: number, seed: number, sway = 0): void {
  tree(g, x, y, size, seed, '#3a2a22', PAL.blossomD, PAL.blossom, sway);
}

/** 베어진 벚나무 그루터기와 쓰러진 줄기 */
export function felledCherry(g: Ctx, x: number, y: number, seed: number): void {
  const rnd = rng(seed);
  R(g, x - 3, y - 5, 6, 5, '#3a2a22');
  R(g, x - 3, y - 5, 6, 1, '#a78466');
  const len = 18 + rnd() * 10;
  R(g, x + 3, y - 3, len, 3, '#3a2a22');
  for (let i = 0; i < 7; i++) {
    const bx = x + 6 + rnd() * len;
    disc(g, bx, y - 4 - rnd() * 4, 2 + rnd() * 2, rnd() < 0.5 ? PAL.blossomD : PAL.blossom);
  }
}

/** 철조망 */
export function wire(g: Ctx, x0: number, x1: number, y: number, seed: number, c = '#2b2621'): void {
  const rnd = rng(seed);
  for (let x = x0; x < x1; x += 14 + Math.floor(rnd() * 8)) {
    R(g, x, y - 9, 1, 9, '#3b2e22');
    line(g, x - 3, y - 7, x + 3, y - 1, '#3b2e22');
  }
  for (let x = x0; x < x1; x++) {
    const yy = y - 4 + Math.round(Math.sin(x * 0.55 + seed) * 3);
    if ((x + seed) % 2 === 0) P(g, x, yy, c);
    const y2 = y - 6 + Math.round(Math.cos(x * 0.4 + seed) * 2);
    if ((x * 3 + seed) % 5 < 2) P(g, x, y2, c);
  }
}

/** 까마귀 */
export function crow(g: Ctx, x: number, y: number, t: number, flying = true): void {
  const c = '#141312';
  if (!flying) {
    R(g, x - 2, y - 3, 4, 3, c);
    R(g, x + 2, y - 4, 2, 2, c);
    P(g, x + 4, y - 3, '#51483a');
    return;
  }
  const w = Math.sin(t * 12) > 0 ? -2 : 1;
  R(g, x - 1, y, 3, 1, c);
  line(g, x - 1, y, x - 4, y + w, c);
  line(g, x + 1, y, x + 4, y + w, c);
}

/** 조명탄 불빛 (주황) */
export function flareGlow(g: Ctx, x: number, y: number, r: number, a: number): void {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, `rgba(255,190,90,${0.55 * a})`);
  grd.addColorStop(0.4, `rgba(240,120,40,${0.22 * a})`);
  grd.addColorStop(1, 'rgba(120,40,10,0)');
  g.fillStyle = grd;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  R(g, x - 1, y - 1, 3, 3, '#fff3c4');
}

/** 불꽃 (애니메이션). 기준점은 바닥 중앙 */
export function fire(g: Ctx, x: number, y: number, w: number, h: number, t: number, seed = 0): void {
  const n = Math.max(3, Math.floor(w / 2));
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const fx = x - w / 2 + k * w;
    const hh = h * (0.45 + 0.55 * Math.sin(Math.PI * k)) * (0.7 + 0.3 * Math.sin(t * 9 + i * 1.7 + seed));
    R(g, fx, y - hh, 2, hh, PAL.fireD);
    R(g, fx, y - hh * 0.7, 2, hh * 0.7, PAL.fire);
    R(g, fx, y - hh * 0.35, 2, hh * 0.35, PAL.fireL);
  }
  // 불티
  for (let i = 0; i < 6; i++) {
    const life = (t * 0.8 + hash(i + seed * 31)) % 1;
    const sx = x + (hash(i * 7 + seed) - 0.5) * w + Math.sin(t * 3 + i) * 3;
    P(g, sx, y - h - life * h * 1.4, life < 0.6 ? PAL.fireL : PAL.fire);
  }
}

/** 연기 기둥 */
export function smoke(g: Ctx, x: number, y: number, t: number, seed: number, col = '#2a2724', scale = 1, drift = 6): void {
  for (let i = 0; i < 9; i++) {
    const life = (t * 0.12 + i / 9 + hash(seed) * 0.3) % 1;
    const px = x + life * drift * 6 + Math.sin(i * 2.1 + seed) * 3 * scale;
    const py = y - life * 60 * scale;
    const rr = (3 + life * 10) * scale;
    g.globalAlpha = (1 - life) * 0.55;
    disc(g, px, py, rr, col);
  }
  g.globalAlpha = 1;
}

/** 해석적 파편 폭발: tSince 경과 시간으로 위치 계산 (결정적) */
export function debris(g: Ctx, x: number, y: number, tSince: number, seed: number, n = 24, cols = [PAL.mud, PAL.mudL, PAL.mudD], power = 1): void {
  if (tSince < 0 || tSince > 2.2) return;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (hash(seed * 97 + i) - 0.5) * 2.4;
    const v = (40 + hash(seed * 31 + i * 3) * 90) * power;
    const px = x + Math.cos(a) * v * tSince;
    const py = y + Math.sin(a) * v * tSince + 0.5 * 160 * tSince * tSince;
    if (py > y + 4) continue;
    R(g, px, py, 2, 2, cols[i % cols.length]);
  }
}

/** 폭발 섬광 + 연기구름 */
export function blast(g: Ctx, x: number, y: number, tSince: number, seed: number, size = 1): void {
  if (tSince < 0 || tSince > 3) return;
  if (tSince < 0.25) {
    const rr = (6 + tSince * 60) * size;
    disc(g, x, y - rr * 0.5, rr, tSince < 0.08 ? '#fff6d8' : PAL.fireL);
    disc(g, x, y - rr * 0.5, rr * 0.6, '#ffffff');
  }
  if (tSince < 0.5) disc(g, x, y - 6 * size, (10 + tSince * 30) * size, PAL.fire);
  for (let i = 0; i < 7; i++) {
    const k = tSince / 3;
    const a = (i / 7) * Math.PI - Math.PI;
    const rr = (5 + k * 12) * size;
    g.globalAlpha = Math.max(0, 0.75 - k * 0.8);
    disc(g, x + Math.cos(a) * (8 + k * 20) * size, y - 8 * size + Math.sin(a) * (6 + k * 24) * size - k * 16 * size, rr, i % 2 ? '#3a342e' : '#56504a');
  }
  g.globalAlpha = 1;
  debris(g, x, y, tSince, seed, 26, undefined, size);
}

/** 모래주머니 한 줄 */
export function sandbags(g: Ctx, x0: number, x1: number, y: number, rows = 2, seed = 0): void {
  for (let rr = 0; rr < rows; rr++) {
    const off = rr % 2 ? 4 : 0;
    for (let x = x0 - off; x < x1; x += 8) {
      const c = hash(x * 3 + rr * 11 + seed) < 0.5 ? '#6e6045' : '#62563e';
      R(g, x, y - (rr + 1) * 4, 7, 4, c);
      R(g, x, y - (rr + 1) * 4 + 3, 7, 1, '#463c2b');
      R(g, x, y - (rr + 1) * 4, 7, 1, '#85765a');
    }
  }
}

/** 판자로 보강한 참호벽 */
export function revetment(g: Ctx, x0: number, x1: number, top: number, bottom: number, seed = 0): void {
  R(g, x0, top, x1 - x0, bottom - top, '#3f3223');
  for (let x = x0; x < x1; x += 3) {
    const c = hash(x + seed) < 0.3 ? '#4d3d2a' : hash(x * 7 + seed) < 0.5 ? '#46372a' : '#3a2e22';
    R(g, x, top, 2, bottom - top, c);
  }
  for (let x = x0 + 6; x < x1; x += 22) R(g, x, top - 2, 2, bottom - top + 2, '#2c2219');
  R(g, x0, top + 4, x1 - x0, 1, '#2c2219');
  R(g, x0, bottom - 8, x1 - x0, 1, '#2c2219');
}

/** 참호 바닥의 널판 (duckboard) */
export function duckboard(g: Ctx, x0: number, x1: number, y: number): void {
  R(g, x0, y, x1 - x0, 3, '#5a4632');
  for (let x = x0; x < x1; x += 4) R(g, x, y, 1, 3, '#3a2c20');
}

/** 뒷모습으로 화면 안쪽(적진)을 향해 달리는 병사 */
export function soldierBack(g: Ctx, x: number, y: number, phase: number, alpha = 1): void {
  x = Math.round(x);
  y = Math.round(y);
  if (alpha < 1) g.globalAlpha = alpha;
  groundShadow(g, x, y);
  for (const [dx, dy] of RING) backBody(g, x + dx, y + dy, phase, OUTLINE);
  backBody(g, x, y, phase);
  g.globalAlpha = 1;
}

function backBody(g: Ctx, x: number, y: number, phase: number, sil?: string): void {
  const c = (col: string) => sil ?? col;
  const sw = Math.sin(phase * Math.PI * 2);
  const la = Math.round(sw * 2);
  const bob = Math.abs(Math.round(Math.cos(phase * Math.PI * 2)));
  // 다리: 번갈아 들린다
  R(g, x - 2, y - 7 - Math.max(0, la) - bob, 2, 7 + Math.max(0, la) - Math.max(0, la), c(PAL.putty));
  R(g, x + 1, y - 7 - Math.max(0, -la) - bob, 2, 7, c(PAL.putty));
  R(g, x - 2, y - 1 - Math.max(0, la) * 2 - bob, 2, 1, c(PAL.boot));
  R(g, x + 1, y - 1 - Math.max(0, -la) * 2 - bob, 2, 1, c(PAL.boot));
  // 몸통과 배낭
  R(g, x - 3, y - 15 - bob, 7, 8, c(PAL.khaki));
  R(g, x - 2, y - 14 - bob, 5, 5, c('#6b5836'));
  R(g, x - 3, y - 9 - bob, 7, 1, c(PAL.khakiD));
  // 팔
  R(g, x - 4, y - 14 - bob + la, 1, 5, c(PAL.khakiD));
  R(g, x + 4, y - 14 - bob - la, 1, 5, c(PAL.khakiD));
  // 소총 (비스듬히)
  line(g, x + 4, y - 12 - bob, x + 7, y - 21 - bob, c(PAL.rifle));
  // 목과 철모
  R(g, x - 1, y - 17 - bob, 3, 2, c(PAL.skinD));
  R(g, x - 4, y - 18 - bob, 9, 1, c(PAL.helmet));
  R(g, x - 2, y - 20 - bob, 5, 2, c(PAL.helmet));
  R(g, x - 1, y - 20 - bob, 3, 1, c(PAL.helmetL));
}
