// 배경 요소: 하늘, 언덕, 들판, 진흙, 폐허, 물
import { Ctx, R, P, W, H, cached, ditherV, disc, hash, fbm, rng, ditherRect } from '../core/gfx';
import { PAL } from './sprites';

/** 캐시된 디더링 하늘 */
export function sky(g: Ctx, key: string, stops: [number, string][], h = H): void {
  g.drawImage(cached('sky:' + key, W, h, (c) => ditherV(c, 0, 0, W, h, stops)), 0, 0);
}

export function stars(g: Ctx, t: number, n: number, maxY: number, alpha = 1, seed = 3): void {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(hash(i * 13 + seed) * W);
    const y = Math.floor(hash(i * 29 + seed) * maxY);
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i) * 3) + i);
    g.globalAlpha = alpha * (0.3 + tw * 0.7);
    P(g, x, y, hash(i * 5) < 0.2 ? '#fff4d8' : '#c9d2e8');
  }
  g.globalAlpha = 1;
}

/** 부드러운 언덕 능선 (패럴랙스) */
export function ridge(g: Ctx, camX: number, par: number, baseY: number, amp: number, freq: number, col: string, seed: number): void {
  g.fillStyle = col;
  for (let x = 0; x < W; x++) {
    const wx = x + camX * par;
    const y = Math.round(baseY - fbm(wx * freq, seed, 3) * amp);
    g.fillRect(x, y, 1, H - y);
  }
}

/** 구름 띠 */
export function clouds(g: Ctx, t: number, camX: number, y: number, col: string, seed: number, speed = 2, density = 0.5): void {
  g.fillStyle = col;
  for (let x = -20; x < W + 20; x += 2) {
    const wx = x + camX * 0.1 + t * speed;
    const v = fbm(wx * 0.012, seed, 3);
    if (v > 1 - density) {
      const hh = Math.round((v - (1 - density)) * 40);
      g.fillRect(x, y - hh / 2, 2, hh);
    }
  }
}

/** 바람에 흔들리는 풀밭 (꽃 포함) */
export function grassField(g: Ctx, t: number, camX: number, y0: number, y1: number, base: string, blade: string, bladeL: string, flowers: string[] = [], wind = 1): void {
  R(g, 0, y0, W, y1 - y0, base);
  const rows = y1 - y0;
  for (let j = 0; j < rows; j += 2) {
    const depth = j / rows; // 0=먼 곳
    const par = 0.4 + depth * 0.6;
    const step = depth < 0.3 ? 3 : 2;
    for (let x = -4; x < W + 4; x += step) {
      const wx = Math.floor(x + camX * par);
      const hsh = hash(wx * 131 + j * 7);
      if (hsh < 0.35) continue;
      const len = 1 + Math.floor(hsh * (2 + depth * 5));
      const sway = Math.round(Math.sin(t * 2.2 * wind + wx * 0.07 + j * 0.2) * (depth * 2) * wind);
      const sx = x - (camX * par - Math.floor(camX * par));
      const c = hsh > 0.85 ? bladeL : blade;
      g.fillStyle = c;
      g.fillRect(Math.round(sx), y0 + j - len + 1, 1, len);
      if (len > 2) g.fillRect(Math.round(sx + sway), y0 + j - len, 1, 1);
      if (flowers.length && hsh > 0.965) {
        P(g, sx + sway, y0 + j - len - 1, flowers[Math.floor(hash(wx) * flowers.length)]);
      }
    }
  }
}

/** 진흙 지면 텍스처 (캐시된 가로 띠) */
export function mudStrip(key: string, w: number, h: number, seed: number, cols = [PAL.mud, PAL.mudD, PAL.mudL]): HTMLCanvasElement {
  return cached('mud:' + key, w, h, (c) => {
    R(c, 0, 0, w, h, cols[0]);
    const rnd = rng(seed);
    for (let i = 0; i < (w * h) / 6; i++) {
      const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
      c.fillStyle = rnd() < 0.5 ? cols[1] : cols[2];
      c.fillRect(x, y, 1 + Math.floor(rnd() * 3), 1);
    }
    // 물웅덩이와 포탄 구덩이
    for (let i = 0; i < w / 40; i++) {
      const x = rnd() * w, y = 6 + rnd() * (h - 10), r = 4 + rnd() * 9;
      disc(c, x, y, r + 2, cols[2], 0.35);
      disc(c, x, y, r, cols[1], 0.35);
      if (rnd() < 0.5) disc(c, x, y + 1, r * 0.6, '#5b6166', 0.3);
    }
  });
}

/** 폐허가 된 건물 실루엣 */
export function ruin(g: Ctx, x: number, y: number, w: number, h: number, seed: number, col: string, win = '#000000', lit = 0): void {
  const rnd = rng(seed);
  // 무너진 윗선
  for (let i = 0; i < w; i++) {
    const hh = h * (0.55 + 0.45 * fbm(i * 0.15, seed, 2)) - (rnd() < 0.05 ? rnd() * 12 : 0);
    R(g, x + i, y - hh, 1, hh, col);
  }
  // 창문
  const cols = Math.max(1, Math.floor(w / 10));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < 3; j++) {
      const wy = y - h * 0.35 - j * 11;
      if (wy < y - h * 0.6) continue;
      if (hash(seed * 31 + i * 7 + j) < 0.35) continue;
      const lc = lit > 0 && hash(seed + i * 3 + j * 5) < 0.4 ? '#e0772a' : win;
      R(g, x + 3 + i * 10, wy, 4, 6, lc);
    }
  }
}

/** 교회 폐허 (첨탑) */
export function church(g: Ctx, x: number, y: number, col: string): void {
  R(g, x - 20, y - 40, 40, 40, col);
  R(g, x - 6, y - 72, 12, 32, col);
  for (let i = 0; i < 10; i++) R(g, x - 5 + i, y - 72 - (5 - Math.abs(i - 4.5)) * 3, 1, (5 - Math.abs(i - 4.5)) * 3, col);
  // 무너진 지붕
  for (let i = 0; i < 20; i++) R(g, x - 20 + i * 2, y - 40 - Math.abs(Math.sin(i * 1.7)) * 8, 2, 8, col);
  R(g, x - 2, y - 60, 4, 8, '#0a0808');
  R(g, x - 12, y - 30, 5, 10, '#0a0808');
  R(g, x + 7, y - 30, 5, 10, '#0a0808');
}

/** 흐르는 물 (가로 띠) */
export function water(g: Ctx, t: number, y0: number, y1: number, deep: string, mid: string, hi: string, speed = 30, camX = 0): void {
  R(g, 0, y0, W, y1 - y0, deep);
  for (let j = y0; j < y1; j++) {
    const k = (j - y0) / (y1 - y0);
    const sp = speed * (0.6 + k * 0.8);
    for (let x = 0; x < W; x += 1) {
      const wx = x + t * sp + camX;
      const v = Math.sin(wx * 0.09 + j * 0.8) + Math.sin(wx * 0.031 - j * 0.3 + t);
      if (v > 1.6) P(g, x, j, hi);
      else if (v > 1.0) P(g, x, j, mid);
    }
  }
}

/** 화면 전체 안개 띠 */
export function haze(g: Ctx, col: string, a: number, y0 = 0, y1 = H): void {
  g.globalAlpha = a;
  R(g, 0, y0, W, y1 - y0, col);
  g.globalAlpha = 1;
}

/** 거친 디더 명암 */
export function shade(g: Ctx, x: number, y: number, w: number, h: number, col: string, d: number): void {
  ditherRect(g, x, y, w, h, col, d);
}
