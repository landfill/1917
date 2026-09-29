// 픽셀 렌더링 기본 도구 — 모든 그래픽은 이 파일의 사각형 찍기에서 시작한다.

export const W = 320;
export const H = 180;

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w = W, h = H): { c: HTMLCanvasElement; g: Ctx } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: false })!;
  g.imageSmoothingEnabled = false;
  return { c, g };
}

/** 정수 좌표로 사각형을 찍는다. */
export function R(g: Ctx, x: number, y: number, w: number, h: number, c: string): void {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function P(g: Ctx, x: number, y: number, c: string): void {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** 채워진 픽셀 원 */
export function disc(g: Ctx, cx: number, cy: number, r: number, c: string, sy = 1): void {
  g.fillStyle = c;
  const rr = r * r;
  const ry = Math.ceil(r * sy);
  for (let y = -ry; y <= ry; y++) {
    const yy = y / sy;
    const w = Math.floor(Math.sqrt(Math.max(0, rr - yy * yy)));
    if (w <= 0 && Math.abs(yy) > r - 0.5) continue;
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

/** 픽셀 선 (Bresenham) */
export function line(g: Ctx, x0: number, y0: number, x1: number, y1: number, c: string): void {
  g.fillStyle = c;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 2000; i++) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// ── 난수 ─────────────────────────────────────────────
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 정수 해시 → [0,1) */
export function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** 1차원 값 노이즈 */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i * 7919 + seed * 104729);
  const b = hash((i + 1) * 7919 + seed * 104729);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

export function fbm(x: number, seed = 0, oct = 3): number {
  let v = 0, amp = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) {
    v += noise1(x * f, seed + i * 13) * amp;
    tot += amp;
    amp *= 0.5;
    f *= 2;
  }
  return v / tot;
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const ease = (t: number) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
/** t가 [a,b] 구간에서 0→1 */
export const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);

// ── 색 ───────────────────────────────────────────────
export function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
export function rgba(h: string, a: number): string {
  const [r, g, b] = hexToRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}

// ── 디더링 그라데이션 (캐시용) ─────────────────────────
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** 세로 방향 디더링 그라데이션을 ImageData로 그린다. stops: [위치(0~1), 색] */
export function ditherV(g: Ctx, x: number, y: number, w: number, h: number, stops: [number, string][]): void {
  const img = g.createImageData(w, h);
  const cols = stops.map(([p, c]) => [p, hexToRgb(c)] as [number, [number, number, number]]);
  for (let j = 0; j < h; j++) {
    const t = h <= 1 ? 0 : j / (h - 1);
    let k = 0;
    while (k < cols.length - 2 && t > cols[k + 1][0]) k++;
    const [p0, c0] = cols[k];
    const [p1, c1] = cols[Math.min(k + 1, cols.length - 1)];
    const f = p1 === p0 ? 0 : clamp((t - p0) / (p1 - p0), 0, 1);
    // 4단계로 양자화한 뒤 베이어 행렬로 섞는다
    const q = f * 4;
    const qi = Math.floor(q);
    const qf = q - qi;
    const ca: number[] = [], cb: number[] = [];
    for (let i = 0; i < 3; i++) {
      ca[i] = lerp(c0[i], c1[i], Math.min(qi, 4) / 4);
      cb[i] = lerp(c0[i], c1[i], Math.min(qi + 1, 4) / 4);
    }
    for (let i = 0; i < w; i++) {
      const th = BAYER[((j + y) & 3) * 4 + ((i + x) & 3)];
      const c = qf > th ? cb : ca;
      const o = (j * w + i) * 4;
      img.data[o] = c[0];
      img.data[o + 1] = c[1];
      img.data[o + 2] = c[2];
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, x, y);
}

/** 두 색을 베이어 패턴으로 섞은 사각형 (밀도 0~1) */
export function ditherRect(g: Ctx, x: number, y: number, w: number, h: number, c: string, density: number): void {
  g.fillStyle = c;
  x = Math.round(x); y = Math.round(y);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (density > BAYER[((y + j) & 3) * 4 + ((x + i) & 3)]) g.fillRect(x + i, y + j, 1, 1);
    }
  }
}

// ── 캐시 ─────────────────────────────────────────────
const cache = new Map<string, HTMLCanvasElement>();
export function cached(key: string, w: number, h: number, draw: (g: Ctx) => void): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    const m = makeCanvas(w, h);
    draw(m.g);
    c = m.c;
    cache.set(key, c);
  }
  return c;
}

// ── 5x7 픽셀 폰트 ────────────────────────────────────
const FONT_SRC: Record<string, string> = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  '1': '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3': '####.|....#|....#|.###.|....#|....#|####.',
  '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  '5': '#####|#....|####.|....#|....#|#...#|.###.',
  '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
  '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
  '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '.': '.|.|.|.|.|.|#',
  ',': '..|..|..|..|..|.#|#.',
  ':': '.|.|#|.|.|#|.',
  '-': '...|...|...|###|...|...|...',
  "'": '#|#|.|.|.|.|.',
  '!': '#|#|#|#|#|.|#',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  '/': '....#|...#.|...#.|..#..|.#...|.#...|#....',
  '·': '.|.|.|#|.|.|.',
  '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
  ' ': '..|..|..|..|..|..|..',
};
const FONT: Record<string, boolean[][]> = {};
for (const k in FONT_SRC) FONT[k] = FONT_SRC[k].split('|').map((r) => [...r].map((ch) => ch === '#'));

export function textWidth(s: string, scale = 1): number {
  let w = 0;
  for (const ch of s.toUpperCase()) {
    const gl = FONT[ch] ?? FONT[' '];
    w += (gl[0].length + 1) * scale;
  }
  return Math.max(0, w - scale);
}

/** 픽셀 폰트로 글자를 찍는다. align: 0=왼쪽, 0.5=가운데, 1=오른쪽 */
export function text(g: Ctx, s: string, x: number, y: number, c: string, scale = 1, align = 0, shadow?: string): void {
  const tw = textWidth(s, scale);
  let cx = Math.round(x - tw * align);
  y = Math.round(y);
  if (shadow) {
    text(g, s, cx + 1, y + 1, shadow, scale, 0);
  }
  g.fillStyle = c;
  for (const ch of s.toUpperCase()) {
    const gl = FONT[ch] ?? FONT[' '];
    for (let j = 0; j < gl.length; j++)
      for (let i = 0; i < gl[j].length; i++) if (gl[j][i]) g.fillRect(cx + i * scale, y + j * scale, scale, scale);
    cx += (gl[0].length + 1) * scale;
  }
}
