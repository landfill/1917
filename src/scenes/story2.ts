// Scenes VIII–XII, XIV–XV: from the convoy to the tree again
import { R, P, W, H, disc, line, hash, span, smooth, ease, lerp, text, mix } from '../core/gfx';
import { soldier, woman, truck, tree, fire, smoke, flareGlow, sandbags, revetment, duckboard, PAL } from '../art/sprites';
import { sky, ridge, clouds, grassField, ruin, church, water, haze, stars } from '../art/env';
import type { StoryScene } from './types';

// ── VIII. 호송대와 무너진 다리 ───────────────────────
const SHOT = 12.6;
export const sceneBridge: StoryScene = {
  kind: 'story',
  num: 8,
  title: '무너진 다리',
  en: 'THE BROKEN BRIDGE',
  clock: '4월 6일 · 18:40',
  mood: 'drive',
  enter: 'drain',
  duration: 17.5,
  lines: [
    { t: 0.6, who: '스미스 대위', text: '타게, 상병. 에쿠스트까지 태워 주지.' },
    { t: 4.6, who: '스미스 대위', text: '다리가 끊겼군. 여기서부턴 혼자 가야 하네. 행운을 비네.' },
    { t: 8.8, text: '부서진 다리 난간 위를 한 발씩 건넌다.' },
    { t: SHOT + 0.2, text: '— 저격수다!' },
  ],
  cues: [
    { t: 0.2, fn: (f) => f.audio.ambience('engine', 6.5, 0.22) },
    { t: SHOT, fn: (f) => { f.audio.gunshot(0.8); f.shake(2); } },
    { t: SHOT + 1.4, fn: (f) => f.audio.gunshot(0.8) },
    { t: SHOT + 2.6, fn: (f) => { f.audio.gunshot(1); f.shake(4); } },
    { t: SHOT + 2.8, fn: (f) => f.audio.gunshot(0.7) },
    { t: SHOT + 3.6, fn: (f) => { f.audio.thud(); f.shake(6); } },
  ],
  draw(g, t) {
    // 해 질 녘
    sky(g, 'dusk', [[0, '#48506a'], [0.45, '#9b7f79'], [0.8, '#d49c6c'], [1, '#e3b27e']], 120);
    ridge(g, t * 10, 0.1, 100, 14, 0.015, '#4c4652', 12);
    // 멀리 에쿠스트 폐허
    for (let i = 0; i < 6; i++) ruin(g, 170 + i * 26, 110, 22, 30 + hash(i) * 20, 40 + i, '#3a3440');
    church(g, 250, 110, '#342f3b');
    const drive = t < 5 ? t : 5;
    // 강과 끊어진 다리
    water(g, t, 128, 150, '#2d3a44', '#48596a', '#8aa0ae', 20);
    R(g, 0, 116, 110, 14, '#4f4435');
    R(g, 0, 150, W, H - 150, '#3a3026');
    // 다리 잔해: 왼쪽 교대 → 부러진 난간 빔 → 오른쪽 교대
    R(g, 100, 118, 12, 30, '#4d473f');
    R(g, 250, 118, 70, 30, '#4d473f');
    R(g, 250, 118, 70, 2, '#6b6457');
    line(g, 112, 120, 250, 122, '#3a3129');
    line(g, 112, 121, 250, 123, '#51463a');
    R(g, 140, 124, 30, 3, '#51463a');
    line(g, 170, 125, 184, 146, '#51463a');
    line(g, 200, 146, 214, 124, '#51463a');
    R(g, 214, 124, 36, 3, '#51463a');
    // 트럭
    const tx = lerp(-60, 70, smooth(span(drive, 0, 4.5)));
    if (t < 9) truck(g, tx, 118, t, t < 4.5);
    if (t > 6.5 && t < 9) truck(g, lerp(70, -80, span(t, 6.5, 9)), 118, t, true);
    // 스코필드: 트럭에서 내려 난간을 건너 오른쪽 교대로
    if (t > 5.2) {
      const cross = span(t, 8.6, 12.2);
      let sx = 90, sy = 118;
      if (t < 8.6) sx = lerp(84, 106, span(t, 5.2, 8.6));
      else {
        sx = lerp(112, 256, cross);
        sy = lerp(120, 122, cross);
      }
      if (t < SHOT + 3.6) {
        const aiming = t > SHOT + 1.8;
        const hiding = t > SHOT + 0.3 && t < SHOT + 1.8;
        soldier(g, Math.min(sx, 262), sy, {
          pose: aiming ? 'aim' : hiding ? 'crouch' : t < 12.2 ? 'walk' : 'stand',
          face: 1,
          phase: t * (t > 8.6 ? 0.8 : 1.4),
          rifle: true,
          mark: true,
        });
      } else {
        soldier(g, 262, 123, { pose: 'fall', face: -1, mark: true });
      }
    }
    // 저격수 창문의 총구 섬광
    const winX = 286, winY = 88;
    R(g, 272, 70, 40, 48, '#3c3642');
    R(g, winX - 3, winY - 4, 7, 8, '#141016');
    for (const s of [SHOT, SHOT + 1.4, SHOT + 2.8]) {
      if (t > s && t < s + 0.08) disc(g, winX, winY, 4, '#fff1b0');
    }
    if (t > SHOT + 2.6 && t < SHOT + 2.68) disc(g, 274, 108, 3, '#fff1b0');
    const k = span(t, 15.5, 17.5);
    haze(g, '#000000', k * k);
  },
};

// ── IX. 불타는 에쿠스트 ──────────────────────────────
export const sceneEcoust: StoryScene = {
  kind: 'story',
  num: 9,
  title: '불타는 도시',
  en: 'ECOUST AT NIGHT',
  clock: '4월 7일 · 02:10',
  mood: 'night',
  enter: 'cut',
  duration: 16,
  lines: [
    { t: 1.6, text: '…얼마나 쓰러져 있었는지 모른다.' },
    { t: 5.4, text: '에쿠스트. 조명탄이 뜰 때마다 도시가 불타오른다.' },
    { t: 10.4, text: '그림자가 달린다. 그림자가 쫓아온다.' },
  ],
  cues: [
    { t: 2.8, fn: (f) => f.audio.flare() },
    { t: 5.0, fn: (f) => f.audio.ambience('fire', 10, 0.12) },
    { t: 7.2, fn: (f) => f.audio.flare() },
    { t: 9.0, fn: (f) => f.audio.distantBoom() },
    { t: 11.2, fn: (f) => { f.audio.gunshot(0.6); } },
    { t: 11.9, fn: (f) => f.audio.gunshot(0.5) },
    { t: 12.2, fn: (f) => f.audio.flare() },
  ],
  draw(g, t) {
    // 조명탄 3발: [발사 시각, 시작 x, 끝 x]
    const flares: [number, number, number][] = [[2.8, 60, 150], [7.2, 250, 170], [12.2, 120, 230]];
    let fx = 160, fy = 40, fa = 0;
    for (const [s, x0, x1] of flares) {
      const k = span(t, s, s + 4.5);
      if (t > s && t < s + 4.8) {
        const a = Math.sin(Math.min(1, k) * Math.PI);
        if (a > fa) {
          fa = a;
          fx = lerp(x0, x1, k);
          fy = 110 - Math.sin(k * Math.PI * 0.9 + 0.2) * 90;
        }
      }
    }
    const light = 0.15 + fa * 0.85;
    const skyTop = lerp(0, 1, light);
    sky(g, 'night', [[0, '#06070c'], [1, '#1b1420']], 130);
    stars(g, t, 40, 60, 1 - fa);
    // 조명탄 주황빛이 하늘을 물들인다
    g.globalAlpha = fa * 0.75;
    R(g, 0, 0, W, 130, '#b8541f');
    g.globalAlpha = fa * 0.5;
    R(g, 0, 60, W, 70, '#e0803a');
    g.globalAlpha = 1;
    const sil = '#0a0708';
    // 폐허 실루엣 (여러 겹)
    const camX = t * 6;
    for (let i = 0; i < 9; i++) ruin(g, i * 44 - (camX * 0.3) % 44 - 20, 150, 40, 60 + hash(i * 5) * 40, 70 + i, '#140d0f', sil, 0);
    church(g, 200 - camX * 0.3, 150, '#120b0d');
    fire(g, 200 - camX * 0.3, 112, 34, 26, t, 3);
    fire(g, 200 - camX * 0.3, 80, 10, 18, t, 5);
    smoke(g, 204 - camX * 0.3, 70, t, 8, '#1e1416', 1.4, 3);
    for (let i = 0; i < 7; i++) ruin(g, i * 60 - (camX * 0.7) % 60 - 30, 160, 52, 36 + hash(i * 9) * 30, 90 + i, sil, '#e0772a', fa);
    R(g, 0, 158, W, H - 158, mix('#0a0708', '#4a2412', fa));
    for (let x = 0; x < W; x += 3) if (hash(x) < 0.4) R(g, x, 158 + Math.floor(hash(x * 3) * 6), 2, 1, mix('#140c0a', '#7a3a18', fa));
    // 스코필드: 비틀거리며 걷다가 달린다
    const run = t > 10.4;
    const sx = run ? lerp(120, 250, span(t, 10.4, 16)) : lerp(40, 120, span(t, 3, 10.4));
    const rim = mix('#3a1a10', '#ffb45a', fa);
    const rx = sx < fx ? 1 : -1;
    if (t > 2) {
      const o = { pose: (run ? 'run' : 'walk') as 'run' | 'walk', face: 1 as const, phase: t * (run ? 2.6 : 1.1), rifle: false };
      soldier(g, sx + rx, 162, { ...o, sil: rim });
      soldier(g, sx, 162, { ...o, sil });
    }
    // 쫓는 그림자 (독일군)
    if (t > 10.8) {
      const gx = lerp(-10, 170, span(t, 10.8, 16));
      const o = { pose: 'run' as const, face: 1 as const, phase: t * 2.6, side: 'german' as const, rifle: true };
      soldier(g, gx + (gx < fx ? 1 : -1), 162, { ...o, sil: rim });
      soldier(g, gx, 162, { ...o, sil });
    }
    if (fa > 0.02) flareGlow(g, fx, fy, 70 + fa * 40, fa);
    // 조명탄 빛에 따라 흔들리는 긴 그림자
    if (fa > 0.1 && t > 2) {
      g.globalAlpha = 0.35 * fa;
      const dir = sx - fx;
      for (let i = 0; i < 30; i++) R(g, sx + (dir / 60) * i, 163 + i * 0.1, 3, 1, '#000');
      g.globalAlpha = 1;
    }
    haze(g, '#000', 0.25 * (1 - skyTop));
    // 암전에서 깨어나기
    haze(g, '#000', 1 - smooth(span(t, 0, 2.6)));
  },
};

// ── X. 지하실 ────────────────────────────────────────
export const sceneCellar: StoryScene = {
  kind: 'story',
  num: 10,
  title: '지하실',
  en: 'THE CELLAR',
  clock: '4월 7일 · 02:40',
  mood: 'lullaby',
  enter: 'fade',
  duration: 18,
  lines: [
    { t: 0.8, text: '무너진 지하실. 촛불 아래 한 여자가 아기를 안고 있다.' },
    { t: 4.6, who: '스코필드', text: '괜찮아요. 해치지 않아요.' },
    { t: 8.2, who: '스코필드', text: '우유예요. 농장에서 받아 온 거예요.' },
    { t: 12.0, who: '스코필드', text: '“They went to sea in a Sieve, they did…”' },
    { t: 15.6, text: '시계는 멈추지 않는다. 새벽이 오고 있다.' },
  ],
  cues: [{ t: 8.6, fn: (f) => f.audio.paper() }],
  draw(g, t) {
    R(g, 0, 0, W, H, '#120d0b');
    // 벽돌 벽
    for (let y = 20; y < 150; y += 7) {
      for (let x = ((y / 7) % 2) * 8 - 8; x < W; x += 16) {
        R(g, x, y, 15, 6, hash(x * 7 + y * 3) < 0.5 ? '#2e2119' : '#281c15');
      }
    }
    // 아치형 벽감
    for (let x = 60; x <= 156; x++) {
      const k = (x - 108) / 48;
      const top = 70 - 40 * Math.sqrt(Math.max(0, 1 - k * k));
      R(g, x, top, 1, 150 - top, '#150f0c');
    }
    for (let i = 0; i < 40; i++) {
      const a = (i / 39) * Math.PI;
      R(g, 108 - Math.cos(a) * 50 - 2, 70 - Math.sin(a) * 42 - 2, 4, 4, '#3a2a1f');
    }
    R(g, 54, 70, 5, 80, '#3a2a1f');
    R(g, 157, 70, 5, 80, '#3a2a1f');
    R(g, 0, 150, W, 30, '#191210');
    // 촛불
    const cx = 170, cy = 128;
    R(g, cx - 12, 132, 30, 4, '#3b2a1c');
    R(g, cx, cy - 6, 2, 6, '#e8dcc0');
    const fl = Math.sin(t * 17) * 0.6 + Math.sin(t * 7.3) * 0.4;
    R(g, cx, cy - 9 + Math.round(fl * 0.5), 2, 3, PAL.fireL);
    P(g, cx, cy - 10, '#fff');
    // 여인과 아기, 스코필드
    woman(g, 206, 152, t, -1);
    const kneel = t > 4.2;
    soldier(g, lerp(80, 146, smooth(span(t, 1, 4.2))), 152, { pose: kneel ? 'kneel' : 'walk', face: 1, phase: t * 1.2, rifle: false, mark: true });
    // 수통을 건넨다
    if (t > 8.2 && t < 11) {
      const k = smooth(span(t, 8.2, 9.6));
      R(g, lerp(152, 196, k), 138, 4, 5, '#5a5a4a');
    }
    // 촛불 조명
    const r = 120 + fl * 6;
    const grd = g.createRadialGradient(cx, cy - 8, 3, cx, cy - 8, r);
    grd.addColorStop(0, 'rgba(255,190,110,0.32)');
    grd.addColorStop(0.45, 'rgba(120,60,20,0.12)');
    grd.addColorStop(1, 'rgba(0,0,0,0.78)');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    haze(g, '#000', 1 - smooth(span(t, 0, 1.6)));
  },
};

// ── XI. 강 ───────────────────────────────────────────
const JUMP = 3.4;
export const sceneRiver: StoryScene = {
  kind: 'story',
  num: 11,
  title: '강',
  en: 'THE RIVER',
  clock: '4월 7일 · 03:30',
  mood: 'river',
  enter: 'flare',
  duration: 16,
  lines: [
    { t: 0.4, who: '독일군', text: 'Halt! Halt!' },
    { t: 2.0, text: '뛰어내릴 수밖에 없다.' },
    { t: 7.4, text: '급류가 몸을 삼킨다. 폭포 — 떨어진다.' },
    { t: 11.6, text: '잔잔해진 물 위로 벚꽃잎이 흘러간다.' },
  ],
  cues: [
    { t: 0.3, fn: (f) => f.audio.gunshot(0.6) },
    { t: 1.2, fn: (f) => f.audio.gunshot(0.7) },
    { t: 2.1, fn: (f) => f.audio.gunshot(0.6) },
    { t: JUMP + 0.6, fn: (f) => { f.audio.splash(); f.shake(3); } },
    { t: JUMP + 0.8, fn: (f) => f.audio.ambience('water', 8, 0.3) },
    { t: 8.4, fn: (f) => { f.audio.splash(); f.shake(4); } },
  ],
  draw(g, t) {
    if (t < JUMP + 0.6) {
      // 다리 위: 쫓기며 뛰어내린다 (야간, 조명탄 잔광)
      sky(g, 'rivernight', [[0, '#0a0b12'], [1, '#2a2230']], 120);
      stars(g, t, 30, 60, 0.8, 11);
      for (let i = 0; i < 6; i++) ruin(g, i * 60 - 10, 100, 50, 40 + hash(i) * 20, 120 + i, '#140f14', '#0a0808');
      water(g, t, 110, H, '#101820', '#1e2c38', '#3d5566', 40);
      R(g, 0, 84, 220, 8, '#2a2428');
      for (let x = 0; x < 220; x += 10) R(g, x, 76, 2, 8, '#2a2428');
      const run = span(t, 0, JUMP);
      const sx = lerp(80, 200, run);
      if (t < JUMP) soldier(g, sx, 84, { pose: 'run', face: 1, phase: t * 2.6, rifle: false, mark: true });
      else {
        const k = (t - JUMP) / 0.6;
        soldier(g, 206 + k * 14, 84 + k * k * 50, { pose: 'fall', face: 1, mark: true });
      }
      for (let i = 0; i < 2; i++) soldier(g, lerp(-20, 120, run) - i * 16, 84, { pose: 'run', face: 1, phase: t * 2.6 + i, side: 'german', rifle: true });
      return;
    }
    // 물속 흐름 → 폭포 → 잔잔한 물
    const fall = span(t, 7.8, 9.2);
    const calm = smooth(span(t, 9.8, 12));
    const deep = '#1d2a33', mid = '#355062', hi = '#9cb6c2';
    sky(g, 'riverdawn', [[0, '#1c2433'], [0.7, '#4a5465'], [1, '#6f6b73']], 70);
    ridge(g, t * 20, 0.2, 70, 10, 0.02, '#232a2e', 5);
    // 강둑의 나무들
    for (let i = 0; i < 8; i++) {
      const x = ((i * 50 - t * 40 * (1 - calm) - calm * 30) % 400 + 400) % 400 - 40;
      tree(g, x, 72, 36, 50 + i, '#141a1a', '#1d2a26', '#26352f');
    }
    water(g, t, 70, H, deep, mid, hi, lerp(90, 12, calm));
    // 폭포 낙하
    if (fall > 0 && fall < 1) {
      for (let i = 0; i < 60; i++) {
        const x = hash(i) * W, y = ((t * 160 + hash(i * 3) * H) % H);
        R(g, x, y, 1, 6, '#d6e4ea');
      }
    }
    // 떠내려가는 스코필드
    const sx = calm > 0 ? lerp(160, 210, calm) : 150 + Math.sin(t * 3) * 20;
    const sy0 = 110 + Math.sin(t * 2) * 5 + (fall > 0 && fall < 1 ? -30 + fall * 70 : 0);
    const sy = lerp(sy0, 80, smooth(span(t, 13, 15.5)));
    disc(g, sx, sy - 2, 3, PAL.skin);
    R(g, sx - 4, sy - 5, 9, 2, PAL.helmet);
    R(g, sx - 5, sy, 12, 3, PAL.khakiD);
    for (let i = 0; i < 6; i++) P(g, sx - 8 + i * 3, sy + 3 + (i % 2), hi);
    // 떠 있는 벚꽃잎
    if (calm > 0) {
      for (let i = 0; i < 70; i++) {
        const x = (hash(i * 5) * 360 + t * 10) % 360 - 20;
        const y = 80 + hash(i * 9) * 100 + Math.sin(t + i) * 1.5;
        g.globalAlpha = calm;
        R(g, x, y, 2, 1, i % 3 ? PAL.blossom : PAL.blossomD);
      }
      g.globalAlpha = 1;
    }
    haze(g, '#dfe7ea', fall > 0 && fall < 1 ? 0.25 : 0);
  },
};

// ── XII. 숲의 노래 ───────────────────────────────────
export const sceneForest: StoryScene = {
  kind: 'story',
  num: 12,
  title: '숲의 노래',
  en: 'THE WAYFARING SONG',
  clock: '4월 7일 · 04:50',
  mood: 'song',
  enter: 'water',
  duration: 17,
  lines: [
    { t: 1.0, text: '새벽 숲. 한 병사의 노래가 나무 사이로 번진다.' },
    { t: 7.6, who: '스코필드', text: '데번셔 연대입니까? 2대대?' },
    { t: 11.0, who: '병사', text: '1차 공격은 이미 시작됐어. 곧 올라간다.' },
    { t: 14.4, who: '스코필드', text: '…늦으면 안 돼.' },
  ],
  cues: [],
  draw(g, t) {
    sky(g, 'forestdawn', [[0, '#2b3446'], [0.6, '#5d6a7a'], [1, '#8894a0']], 130);
    // 먼 나무줄기들 (여러 겹)
    for (let layer = 0; layer < 3; layer++) {
      const col = ['#3d4855', '#2a333d', '#1b2229'][layer];
      for (let i = 0; i < 14; i++) {
        const x = ((i * 31 + layer * 13 + hash(i + layer * 20) * 20 - t * (layer + 1) * 1.2) % 360 + 360) % 360 - 20;
        const w = 2 + layer * 2 + Math.floor(hash(i * 3 + layer) * 3);
        R(g, x, 0, w, 150, col);
      }
    }
    // 빛줄기
    for (let i = 0; i < 4; i++) {
      g.globalAlpha = 0.06 + 0.03 * Math.sin(t * 0.7 + i);
      g.fillStyle = '#e8e2c8';
      g.beginPath();
      const x = 60 + i * 70;
      g.moveTo(x, 0); g.lineTo(x + 14, 0); g.lineTo(x + 60, 150); g.lineTo(x + 30, 150);
      g.fill();
    }
    g.globalAlpha = 1;
    R(g, 0, 148, W, H - 148, '#1c231f');
    grassField(g, t, 0, 148, H, '#1c231f', '#28332a', '#34423a', [], 0.3);
    // 앉아서 듣는 병사들
    const sit = [[40, -1], [70, 1], [100, 1], [196, -1], [226, -1], [256, 1], [280, -1]] as const;
    sit.forEach(([x, f], i) => soldier(g, x, 158 + (i % 2), { pose: i % 3 === 0 ? 'crouch' : 'sit', face: f as 1 | -1, rifle: i % 2 === 0 }));
    // 노래하는 병사 (가운데 서 있음)
    const breath = Math.round(Math.sin(t * 1.6));
    soldier(g, 158, 158 + (breath > 0 ? 0 : 0), { pose: 'stand', face: -1, rifle: false });
    // 음표 입김
    for (let i = 0; i < 4; i++) {
      const life = (t * 0.25 + i / 4) % 1;
      g.globalAlpha = (1 - life) * 0.6;
      P(g, 152 - life * 10 + Math.sin(t * 2 + i) * 2, 138 - life * 30, '#d8dde4');
      g.globalAlpha = 1;
    }
    // 스코필드: 왼쪽에서 걸어 들어와 멈춘다
    const walkIn = span(t, 3.5, 7.2);
    soldier(g, lerp(-10, 120, smooth(walkIn)), 162, { pose: walkIn > 0 && walkIn < 1 ? 'walk' : 'stand', face: 1, phase: t * 1.2, mark: true, bare: true });
    haze(g, '#9aa5b0', 0.08);
  },
};

// ── XIV. 전달 ────────────────────────────────────────
export const sceneDelivery: StoryScene = {
  kind: 'story',
  num: 14,
  title: '전달',
  en: 'THE MESSAGE',
  clock: '4월 7일 · 06:05',
  mood: 'relief',
  enter: 'flash',
  duration: 23,
  lines: [
    { t: 0.5, who: '스코필드', text: '매켄지 대령님! 에린모어 장군의 명령입니다!' },
    { t: 4.4, text: '대령은 한참 동안 종이를 내려다보았다.' },
    { t: 7.4, who: '매켄지 대령', text: '공격 중지. 전원 참호로 복귀시켜.' },
    { t: 11.4, who: '매켄지 대령', text: '오늘은 끝났다. 하지만 다음 주면 또 다른 명령이 오겠지.' },
    { t: 15.4, who: '스코필드', text: '블레이크 중위님… 동생 분이 저와 함께 왔습니다.' },
    { t: 19.4, who: '스코필드', text: '빨리 갔습니다. 아프지 않았어요. 형님 이야기를 많이 했습니다.' },
  ],
  cues: [
    { t: 8.2, fn: (f) => f.audio.whistle(1.0, 0.1) },
    { t: 8.9, fn: (f) => f.audio.whistle(0.8, 0.06) },
    { t: 9.5, fn: (f) => f.audio.whistle(1.1, 0.04) },
    { t: 3.6, fn: (f) => f.audio.paper() },
  ],
  draw(g, t) {
    const second = t > 14.2;
    if (!second) {
      // 지휘 참호: 흙벽, 모래주머니, 새벽빛
      sky(g, 'hqdawn', [[0, '#8c7f76'], [1, '#d7b28a']], 60);
      revetment(g, 0, W, 56, 150, 9);
      sandbags(g, 0, W, 58, 2, 3);
      R(g, 0, 150, W, H - 150, '#221a13');
      duckboard(g, 0, W, 150);
      R(g, 190, 70, 70, 50, '#2a1f16'); // 벙커 입구
      R(g, 186, 66, 78, 5, '#4b3926');
      soldier(g, 214, 152, { side: 'officer', face: -1, pack: false });
      soldier(g, 244, 152, { side: 'officer', face: -1, pack: false });
      const reach = smooth(span(t, 0, 2.6));
      soldier(g, lerp(80, 188, reach), 154, { pose: reach < 1 ? 'run' : 'stand', face: 1, phase: t * 2.4, mark: true, bare: true });
      if (t > 2.8) R(g, t > 3.6 ? 206 : 196, 136, 6, 4, '#f4e7c4');
      // 호루라기에 맞춰 참호 위 병사들이 멈추고 내려온다
      for (let i = 0; i < 8; i++) {
        const back = span(t, 8.4 + i * 0.22, 8.8 + i * 0.22);
        const x = 10 + i * 22;
        const y = lerp(56, 150, back);
        if (back < 1) soldier(g, x, y, { pose: back > 0 ? 'climb' : 'stand', face: 1, rifle: true, sil: back > 0 ? undefined : '#3a2e26' });
      }
      haze(g, '#000', span(t, 13.2, 14.2));
      return;
    }
    // 부상자 구호소 천막
    const k = t - 14.2;
    R(g, 0, 0, W, H, '#3c3527');
    for (let i = 0; i < 16; i++) R(g, i * 20, 0, 1, 150, '#4a412f');
    g.globalAlpha = 0.25;
    R(g, 0, 0, W, 150, '#e6d7b0');
    g.globalAlpha = 1;
    R(g, 0, 150, W, H - 150, '#2c241a');
    for (let i = 0; i < 5; i++) {
      const x = 20 + i * 64;
      R(g, x, 138, 44, 4, '#6b5e44');
      R(g, x, 134, 44, 4, '#bab09a');
      R(g, x + 2, 142, 2, 10, '#3b2e20');
      R(g, x + 40, 142, 2, 10, '#3b2e20');
    }
    soldier(g, 190, 154, { side: 'officer', face: -1, pack: false, bare: false });
    soldier(g, lerp(60, 160, smooth(span(k, 0, 2.4))), 156, { pose: k < 2.4 ? 'walk' : 'stand', face: 1, phase: k * 1.2, mark: true, bare: true });
    haze(g, '#000', 1 - span(k, 0, 1));
  },
};

// ── XV. 다시, 나무 아래 ──────────────────────────────
export const sceneEnding: StoryScene = {
  kind: 'story',
  num: 15,
  title: '다시, 나무 아래',
  en: 'COME BACK TO US',
  clock: '4월 7일 · 06:40',
  mood: 'resolve',
  enter: 'pan',
  duration: 22,
  lines: [
    { t: 1.2, text: '스코필드는 들판의 나무에 기대 앉았다. 처음 그랬던 것처럼.' },
    { t: 6.4, text: '주머니 속 사진 두 장. 뒷면에 적힌 한 줄.' },
    { t: 12.2, text: '“돌아와 줘.”' },
    { t: 16.6, text: '1917년 4월 7일 아침. 1,600명이 살아서 이 해를 보았다.' },
  ],
  cues: [
    { t: 0.8, fn: (f) => f.audio.birds() },
    { t: 6.8, fn: (f) => f.audio.paper() },
    { t: 11.6, fn: (f) => f.audio.paper() },
  ],
  draw(g, t) {
    const push = ease(span(t, 0, 7));
    sky(g, 'morning', [[0, '#8fa2b8'], [0.5, '#e3cfae'], [0.75, '#f3d9a3'], [1, '#f6e4bb']], 120);
    // 떠오르는 해
    disc(g, 70, 96, 14, '#fbe7b5');
    disc(g, 70, 96, 10, '#fff4d6');
    clouds(g, t, 0, 40, '#efdcc0', 31, 1.5, 0.3);
    ridge(g, t * 2, 0.2, 108, 16, 0.012, '#8f9278', 14);
    grassField(g, t, t * 2, 108, H, '#56613a', '#6e7b45', '#90995a', ['#e8d86a', '#f1efe6'], 0.8);
    const tx = lerp(236, 212, push);
    tree(g, tx, 156, 110, 17, '#2d2419', '#4f5c33', '#6a7942', Math.sin(t * 0.8) * 1.2);
    // 스코필드: 걸어와 앉는다
    const arrive = span(t, 0, 4.4);
    if (arrive < 1) soldier(g, lerp(120, tx - 4, arrive), 160, { pose: 'walk', face: 1, phase: t * 1.1, mark: true, bare: true });
    else soldier(g, tx - 4, 159, { pose: 'sit', face: -1, mark: true, bare: true });
    // 사진 클로즈업
    const photo = smooth(span(t, 7, 8.6)) * (1 - smooth(span(t, 15.4, 16.6)));
    if (photo > 0) {
      g.globalAlpha = photo;
      const flip = t > 11.4;
      const px = 110, py = 36 + (1 - photo) * 10;
      R(g, px - 2, py - 2, 104, 72, '#1a140e');
      R(g, px, py, 100, 68, flip ? '#e4dac2' : '#c9bb98');
      if (!flip) {
        // 세피아 사진: 여인과 아이들
        R(g, px + 6, py + 6, 88, 56, '#8a7556');
        for (const [dx, h] of [[26, 34], [46, 26], [60, 20]] as const) {
          R(g, px + dx, py + 62 - h, 10, h, '#4b3b28');
          disc(g, px + dx + 5, py + 62 - h - 4, 4, '#5e4a33');
        }
      } else {
        text(g, 'COME BACK', px + 50, py + 20, '#3a2d22', 1, 0.5);
        text(g, 'TO US', px + 50, py + 32, '#3a2d22', 1, 0.5);
        line(g, px + 30, py + 44, px + 70, py + 45, '#3a2d22');
      }
      g.globalAlpha = 1;
    }
    // 꽃잎과 빛
    for (let i = 0; i < 16; i++) {
      const life = (t * 0.06 + hash(i * 11)) % 1;
      P(g, (hash(i) * 400 - life * 70) % W, 20 + life * 160, i % 2 ? PAL.blossom : '#f4efe0');
    }
    haze(g, '#fff1d0', 0.06 + 0.04 * Math.sin(t * 0.5));
    haze(g, '#000', smooth(span(t, 19.5, 22)));
  },
};

