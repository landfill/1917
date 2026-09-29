// 시작 화면 — 봉인된 명령서. 길게 눌러 봉인을 뜯어야 여정이 시작된다.
// 영화의 주제(한 통의 명령, 흘러가는 시간, 처음과 끝의 나무)를 한 화면에 담았다.
import { Ctx, R, P, W, H, disc, hash, span, smooth, text, clamp, lerp } from '../core/gfx';
import { tree, debris, PAL } from '../art/sprites';
import { sky, ridge, stars, grassField } from '../art/env';
import type { AudioEngine } from '../core/audio';

export const title = {
  hold: 0,
  broken: -1, // 봉인이 뜯긴 시각 (-1: 아직)
  beat: 0,
  reset() {
    this.hold = 0;
    this.broken = -1;
    this.beat = 0;
  },
  /** true를 돌려주면 봉인이 막 뜯긴 것 */
  update(dt: number, t: number, holding: boolean, a: AudioEngine): boolean {
    if (this.broken >= 0) return false;
    if (holding) this.hold = Math.min(1, this.hold + dt / 1.8);
    else this.hold = Math.max(0, this.hold - dt / 0.9);
    if (holding) {
      this.beat -= dt;
      if (this.beat <= 0) {
        a.heartbeat(0.4 + this.hold * 0.6);
        this.beat = lerp(0.85, 0.32, this.hold);
      }
    } else this.beat = 0;
    if (this.hold >= 1) {
      this.broken = t;
      a.crack();
      a.paper();
      return true;
    }
    return false;
  },
  draw(g: Ctx, t: number): void {
    const k = this.broken >= 0 ? t - this.broken : -1;
    // 동트기 직전의 하늘 — 영화의 마지막 아침과 같은 시간
    sky(g, 'predawn', [[0, '#080b16'], [0.35, '#1a1f36'], [0.62, '#3e3552'], [0.82, '#7b5763'], [1, '#b67b61']], 128);
    stars(g, t, 70, 80, 0.9, 5);
    ridge(g, t * 1.5, 0.3, 120, 12, 0.012, '#2a2436', 3);
    ridge(g, t * 2, 0.6, 128, 8, 0.02, '#1b1726', 7);
    // 들판 위 외로운 나무 (첫 장면과 마지막 장면의 그 나무)
    tree(g, 252, 146, 96, 17, '#0c0a10', '#110e17', '#17131f', Math.sin(t * 0.7) * 1.2);
    grassField(g, t, t * 3, 132, H, '#0f0c14', '#1b1722', '#2b2433', [], 1.1);
    // 흩날리는 꽃잎
    for (let i = 0; i < 18; i++) {
      const life = (t * 0.05 + hash(i * 3)) % 1;
      const x = (hash(i * 7) * 420 - life * 120 + Math.sin(t + i) * 6) % W;
      const y = -6 + life * 190;
      g.globalAlpha = 0.7;
      R(g, x, y, 2, 1, i % 3 ? PAL.blossom : PAL.blossomD);
    }
    g.globalAlpha = 1;

    // 제목 — 영사기처럼 살짝 깜박인다
    const flick = 0.92 + 0.08 * Math.sin(t * 23) * Math.sin(t * 7);
    g.globalAlpha = flick;
    text(g, '1917', 160 + 2, 22 + 2, '#000000', 6, 0.5);
    text(g, '1917', 160, 22, '#eadcbc', 6, 0.5);
    g.globalAlpha = 1;
    R(g, 118, 72, 84, 1, '#6b5a4a');

    // 명령서 봉투
    const ex = 160, ey = 102;
    const ew = 100, eh = 48;
    const lift = k > 0 ? smooth(span(k, 0.2, 1.2)) : 0;
    R(g, ex - ew / 2 + 2, ey - eh / 2 + 3, ew, eh, '#07060a');
    R(g, ex - ew / 2, ey - eh / 2, ew, eh, '#d9c9a3');
    R(g, ex - ew / 2, ey + eh / 2 - 2, ew, 2, '#b9a67d');
    // 봉투 접힌 선
    for (let i = 0; i < ew / 2; i++) {
      const yy = ey - eh / 2 + Math.round((i / (ew / 2)) * (eh * 0.55) * (1 - lift * 2));
      P(g, ex - ew / 2 + i, yy, '#a8946b');
      P(g, ex + ew / 2 - 1 - i, yy, '#a8946b');
    }
    // 수신인
    text(g, 'COL. MACKENZIE', ex - ew / 2 + 5, ey + 6, '#4a3b2a', 1, 0);
    text(g, '2ND DEVONS', ex - ew / 2 + 5, ey + 14, '#4a3b2a', 1, 0);
    R(g, ex + ew / 2 - 14, ey - eh / 2 + 4, 10, 12, '#b35c4a');
    R(g, ex + ew / 2 - 13, ey - eh / 2 + 5, 8, 10, '#d9c9a3');
    text(g, 'URGENT', ex - ew / 2 + 5, ey - eh / 2 + 5, '#8f2d25', 1, 0);

    // 밀랍 봉인과 누르는 동안 차오르는 고리
    const sx = ex, sy = ey - 6;
    if (k < 0) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      const n = 64;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const on = i / n < this.hold;
        const rx = sx + Math.cos(a) * 11, ry = sy + Math.sin(a) * 11;
        if (on) P(g, rx, ry, '#f2d38a');
        else if (i % 4 === 0) { g.globalAlpha = 0.35 + pulse * 0.3; P(g, rx, ry, '#f2d38a'); g.globalAlpha = 1; }
      }
      const shake = this.hold > 0.6 ? Math.round((hash(Math.floor(t * 40)) - 0.5) * this.hold * 2) : 0;
      disc(g, sx + shake, sy, 6.5, '#6e1714');
      disc(g, sx + shake, sy, 5.5, '#9a2621');
      disc(g, sx + shake - 1, sy - 1, 2.5, '#b8392f');
      text(g, 'E', sx + shake - 2, sy - 3, '#6e1714', 1, 0);
    } else {
      // 쪼개진 봉인
      const d = smooth(span(k, 0, 0.5)) * 8;
      disc(g, sx - 3 - d, sy + d * 0.6, 4, '#8a211c');
      disc(g, sx + 3 + d, sy + d * 0.9, 4, '#8a211c');
      debris(g, sx, sy + 4, k, 7, 18, ['#9a2621', '#6e1714', '#b8392f'], 0.6);
      // 펼쳐지는 종이
      if (lift > 0) {
        const lh = Math.round(40 * lift);
        R(g, ex - 30, ey - eh / 2 - lh + 4, 60, lh, '#efe4c8');
        for (let i = 0; i < 5; i++) R(g, ex - 24, ey - eh / 2 - lh + 10 + i * 6, clamp(48 - i * 6, 10, 48) * lift, 1, '#8c7a5c');
      }
    }

    // 안내
    if (k < 0) {
      const a = 0.45 + 0.4 * Math.sin(t * 2.4);
      g.globalAlpha = a;
      text(g, 'HOLD TO BREAK THE SEAL', 160, 134, '#eadcbc', 1, 0.5);
      g.globalAlpha = 1;
    }
    // 봉인이 뜯긴 뒤에는 서서히 어두워진다
    if (k > 0) {
      g.globalAlpha = clamp(smooth(span(k, 1.4, 3)) * 0.6, 0, 1);
      R(g, 0, 0, W, H, '#000');
      g.globalAlpha = 1;
    }
  },
};
