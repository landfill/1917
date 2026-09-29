// 장면 I–VII : 나무 아래에서 블레이크의 죽음까지
import { R, P, W, H, disc, line, hash, span, smooth, ease, clamp, lerp } from '../core/gfx';
import { soldier, tree, cherryTree, felledCherry, plane, wire, crow, rat, fire, smoke, blast, sandbags, revetment, duckboard, PAL } from '../art/sprites';
import { sky, ridge, clouds, grassField, mudStrip, haze, shade } from '../art/env';
import type { StoryScene } from './types';

const SPRING_FLOWERS = ['#e8d86a', '#f1efe6', '#c7a3d6', '#e8d86a'];

// ── I. 나무 아래 ─────────────────────────────────────
export const sceneTree: StoryScene = {
  kind: 'story',
  num: 1,
  title: '나무 아래',
  en: 'THE TREE',
  clock: '4월 6일 · 14:00',
  mood: 'pastoral',
  enter: 'tilt',
  duration: 14,
  lines: [
    { t: 0.8, text: '1917년 4월 6일. 프랑스 북부, 서부 전선.' },
    { t: 4.6, who: '상사', text: '블레이크 상병! 한 명 골라서 따라와.' },
    { t: 8.0, who: '블레이크', text: '일어나, 스코필드. 가자.' },
    { t: 11.0, who: '스코필드', text: '…무슨 일인데?' },
  ],
  cues: [
    { t: 0.5, fn: (f) => f.audio.birds() },
    { t: 3.2, fn: (f) => f.audio.birds() },
    { t: 7.1, fn: (f) => f.audio.birds() },
  ],
  draw(g, t) {
    const leave = span(t, 9, 14);
    const camX = lerp(0, -50, ease(leave)) + Math.sin(t * 0.3) * 2;
    sky(g, 'afternoon', [[0, '#8ea3b3'], [0.5, '#b9c3bf'], [0.62, '#d4d3c2']]);
    clouds(g, t, camX, 34, '#cdd2cc', 3, 1.5, 0.35);
    clouds(g, t, camX, 22, '#dfe1d8', 9, 2.5, 0.25);
    ridge(g, camX, 0.15, 98, 20, 0.01, '#8b9483', 1);
    ridge(g, camX, 0.3, 108, 16, 0.016, '#6f7a5d', 2);
    // 멀리 보이는 참호선과 연기
    smoke(g, 60 - camX * 0.3, 96, t, 4, '#9aa09a', 0.5, 2);
    grassField(g, t, camX, 104, H, '#4e5a33', '#66733f', '#8a9652', SPRING_FLOWERS, 1);
    // 큰 나무
    const tx = 212 - camX;
    shade(g, tx - 40, 150, 90, 12, '#3a4527', 0.6);
    tree(g, tx, 156, 120, 17, '#2d2419', '#465330', '#5f6d3c', Math.sin(t * 0.8) * 1.2);
    // 두 사람: 처음엔 앉아 졸고, 상사가 부르면 일어나 왼쪽으로 걸어간다
    const stood = t > 8.4;
    const walkT = Math.max(0, t - 9);
    if (!stood) {
      soldier(g, tx - 6, 158, { pose: 'sit', face: -1, rifle: false });
      soldier(g, tx + 9, 159, { pose: 'sit', face: 1, mark: true });
    } else {
      const bx = tx - 10 - walkT * 18;
      const sx = tx + 6 - walkT * 18;
      soldier(g, bx, 160, { pose: walkT > 0 ? 'walk' : 'stand', face: -1, phase: walkT * 1.6, rifle: true });
      soldier(g, sx, 162, { pose: walkT > 0.8 ? 'walk' : 'stand', face: -1, phase: walkT * 1.6 + 0.4, rifle: true, mark: true });
    }
    // 상사: 왼쪽에서 걸어와 선다
    const sgIn = span(t, 3.4, 6.4);
    const sgx = lerp(-20, tx - 60, ease(sgIn)) - (t > 9 ? (t - 9) * 18 : 0);
    if (t > 3.4) soldier(g, sgx, 160, { pose: sgIn < 1 || t > 9 ? 'walk' : 'stand', face: t > 9 ? -1 : 1, phase: t * 1.6, side: 'officer' });
    // 흩날리는 꽃잎
    for (let i = 0; i < 14; i++) {
      const life = (t * 0.07 + hash(i) ) % 1;
      const px = (hash(i * 3) * W * 1.3 - life * 90 - camX * 0.5 + W) % W;
      const py = 30 + life * 150 + Math.sin(t * 2 + i) * 4;
      P(g, px, py, i % 3 ? '#f4efe0' : '#e6d56c');
    }
  },
};

// ── II. 명령 ─────────────────────────────────────────
export const sceneOrders: StoryScene = {
  kind: 'story',
  num: 2,
  title: '명령',
  en: 'THE ORDERS',
  clock: '4월 6일 · 14:10',
  mood: 'orders',
  enter: 'pan',
  duration: 15,
  lines: [
    { t: 0.6, who: '에린모어 장군', text: '데번셔 연대 2대대가 새벽에 공격한다. 적이 후퇴했다고 믿고 있지.' },
    { t: 4.8, who: '에린모어 장군', text: '항공 정찰 결과 함정이다. 전화선은 모두 끊겼다.' },
    { t: 8.8, who: '에린모어 장군', text: '매켄지 대령에게 이 명령을 전하게. 1,600명이 걸려 있다. 블레이크, 자네 형도 그중 하나다.' },
    { t: 13.2, who: '블레이크', text: '…알겠습니다.' },
  ],
  cues: [{ t: 10.6, fn: (f) => f.audio.paper() }],
  draw(g, t) {
    const push = ease(span(t, 0, 15));
    const cx = lerp(0, 10, push);
    // 벙커 내부: 나무 기둥과 흙벽
    R(g, 0, 0, W, H, '#1c1611');
    for (let x = -10; x < W + 10; x += 4) {
      const c = hash(x * 3) < 0.4 ? '#2a2119' : hash(x * 5) < 0.5 ? '#251d16' : '#211a14';
      R(g, x - cx * 0.5, 20, 3, 130, c);
    }
    for (const bx of [30, 150, 270]) {
      R(g, bx - cx * 0.6, 14, 8, 150, '#3b2c1e');
      R(g, bx - cx * 0.6, 14, 2, 150, '#4b3926');
    }
    R(g, 0, 12, W, 10, '#3b2c1e');
    R(g, 0, 20, W, 2, '#241b13');
    // 지도가 붙은 벽
    R(g, 190 - cx * 0.6, 40, 60, 40, '#b8a57a');
    for (let i = 0; i < 8; i++) line(g, 192 - cx * 0.6 + i * 7, 42, 196 - cx * 0.6 + i * 6, 78, '#8a7651');
    line(g, 196 - cx * 0.6, 60, 244 - cx * 0.6, 52, '#8f2d25');
    line(g, 196 - cx * 0.6, 61, 244 - cx * 0.6, 53, '#8f2d25');
    // 흔들리는 등불
    const sw = Math.sin(t * 1.3) * 5;
    const lx = 120 + sw - cx, ly = 46;
    line(g, 120 - cx, 22, lx, ly - 4, '#15100b');
    R(g, lx - 2, ly - 4, 5, 6, '#e8c071');
    R(g, lx - 1, ly - 3, 3, 4, '#fff1b8');
    // 장군 (탁자 뒤에 선다)
    soldier(g, 150 - cx, 157, { side: 'general', face: -1, pack: false });
    soldier(g, 176 - cx, 157, { side: 'officer', face: -1, pack: false });
    // 탁자
    R(g, 84 - cx, 145, 110, 4, '#5a4128');
    R(g, 88 - cx, 149, 3, 8, '#3c2b1b');
    R(g, 188 - cx, 149, 3, 8, '#3c2b1b');
    R(g, 96 - cx, 143, 34, 2, '#c9b78a'); // 지도
    R(g, 138 - cx, 142, 6, 3, '#f4e7c4'); // 편지
    R(g, 112 - cx, 139, 2, 4, '#d8cfb8'); // 초
    P(g, 112 - cx, 138, '#ffd76a');
    // 블레이크와 스코필드
    soldier(g, 56 - cx, 158, { face: 1, rifle: true });
    soldier(g, 38 - cx, 159, { face: 1, rifle: true, mark: true });
    // 명령서를 건넨다
    if (t > 10.2) {
      const k = ease(span(t, 10.2, 11.6));
      const ex = lerp(140, 64, k) - cx, ey = lerp(142, 146, k) - Math.sin(k * Math.PI) * 6;
      R(g, ex, ey, 7, 5, '#f4e7c4');
      R(g, ex + 3, ey + 2, 2, 2, '#9b2a22');
    }
    // 등불 조명
    const grd = g.createRadialGradient(lx, ly, 4, lx, ly, 150);
    grd.addColorStop(0, 'rgba(255,200,110,0.35)');
    grd.addColorStop(0.5, 'rgba(120,70,20,0.1)');
    grd.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    R(g, 0, 157, W, H - 157, '#120e0a');
    duckboard(g, 0, W, 157);
  },
};

// ── III. 참호 ────────────────────────────────────────
export const sceneTrenches: StoryScene = {
  kind: 'story',
  num: 3,
  title: '참호',
  en: 'THE TRENCHES',
  clock: '4월 6일 · 14:25',
  mood: 'tension',
  enter: 'pan',
  duration: 12,
  lines: [
    { t: 0.5, who: '블레이크', text: '비켜 줘, 장군 명령이다!' },
    { t: 4.8, who: '스코필드', text: '해 지기 전에 닿을 수 있을까?' },
    { t: 8.6, who: '블레이크', text: '닿아야 해. 형이 거기 있어.' },
  ],
  cues: [
    { t: 2.0, fn: (f) => f.audio.distantBoom() },
    { t: 7.5, fn: (f) => f.audio.distantBoom() },
  ],
  draw(g, t) {
    const camX = t * 24;
    sky(g, 'overcast', [[0, '#77807f'], [1, '#a3a79c']], 60);
    R(g, 0, 60, W, H - 60, '#2a2119');
    clouds(g, t, camX, 20, '#8c928d', 4, 3, 0.4);
    // 뒤쪽 흉벽 너머로 보이는 들판
    R(g, 0, 46, W, 10, '#4a4636');
    // 참호 뒷벽
    const off = -(camX % 400);
    for (let k = -1; k < 2; k++) {
      const bx = off + k * 400;
      revetment(g, bx, bx + 400, 56, 150, 3);
      sandbags(g, bx, bx + 400, 58, 2, 5);
    }
    // 참호 속 병사들 (월드 좌표)
    for (let i = 0; i < 26; i++) {
      const wx = i * 34 + hash(i) * 20;
      const x = wx - camX;
      if (x < -20 || x > W + 20) continue;
      const pose = hash(i * 3) < 0.3 ? 'sit' : hash(i * 3) < 0.55 ? 'crouch' : 'stand';
      soldier(g, x, 152, { pose, face: hash(i * 7) < 0.5 ? 1 : -1, rifle: hash(i * 5) < 0.6, phase: 0 });
    }
    duckboard(g, 0, W, 152);
    R(g, 0, 155, W, H - 155, '#1d1712');
    // 주인공 둘: 화면 안에서 앞으로 걸어간다 (카메라와 같은 속도)
    soldier(g, 150, 160, { pose: 'walk', face: 1, phase: t * 1.8, rifle: true });
    soldier(g, 128, 161, { pose: 'walk', face: 1, phase: t * 1.8 + 0.5, rifle: true, mark: true });
    // 앞쪽 참호벽 가장자리 (전경, 빠르게 지나감)
    const fo = -((camX * 1.4) % 60);
    for (let x = fo; x < W; x += 60) {
      R(g, x, 168, 30, 12, '#140f0b');
      R(g, x + 30, 172, 30, 8, '#17120d');
    }
    haze(g, '#7d7a6d', 0.08, 0, H);
  },
};

// ── IV. 무인지대 ─────────────────────────────────────
export const sceneNoMansLand: StoryScene = {
  kind: 'story',
  num: 4,
  title: '무인지대',
  en: "NO MAN'S LAND",
  clock: '4월 6일 · 14:40',
  mood: 'tension',
  enter: 'tilt',
  duration: 13,
  lines: [
    { t: 0.6, text: '무인지대. 한 걸음마다 진흙이 발목을 붙잡는다.' },
    { t: 5.0, who: '스코필드', text: '조용해. 너무 조용해.' },
    { t: 9.2, who: '블레이크', text: '정말 떠났나 봐. 저기 — 독일군 참호다.' },
  ],
  cues: [
    { t: 1.5, fn: (f) => f.audio.ambience('wind', 11, 0.12) },
    { t: 3.0, fn: (f) => f.audio.distantBoom() },
  ],
  draw(g, t) {
    const camX = t * 14;
    sky(g, 'grey', [[0, '#5d6264'], [0.55, '#8c8f88'], [1, '#9b9a8e']], 110);
    clouds(g, t, camX, 30, '#6d7271', 11, 2, 0.45);
    ridge(g, camX, 0.1, 96, 10, 0.02, '#5d5a4c', 4);
    // 멀리 독일군 참호선
    for (let i = 0; i < 12; i++) {
      const x = ((i * 47 - camX * 0.3) % 360 + 360) % 360 - 20;
      R(g, x, 90, 1, 6, '#39342a');
    }
    const mud = mudStrip('nml2', 640, 80, 7, ['#3b332c', '#29231e', '#4d443b']);
    const mx = -((camX) % 640);
    g.drawImage(mud, mx, 98);
    g.drawImage(mud, mx + 640, 98);
    // 앙상한 나무 그루터기, 철조망, 버려진 철모
    for (let i = 0; i < 14; i++) {
      const wx = i * 70 + hash(i * 11) * 40;
      const x = wx - camX;
      if (x < -40 || x > W + 40) continue;
      const kind = Math.floor(hash(i * 13) * 3);
      if (kind === 0) {
        R(g, x, 100 - 20 - hash(i) * 10, 3, 24 + hash(i) * 10, '#2a241c');
        line(g, x + 1, 90, x + 7, 84, '#2a241c');
      } else if (kind === 1) {
        wire(g, x - 20, x + 30, 128 + hash(i) * 8, i);
      } else {
        disc(g, x, 142, 3, PAL.helmet, 0.5);
        R(g, x - 4, 142, 9, 1, PAL.helmet);
      }
    }
    // 까마귀
    for (let i = 0; i < 4; i++) crow(g, (i * 90 + t * 20) % 380 - 30, 40 + Math.sin(t + i) * 6 + i * 6, t + i);
    crow(g, 240 - camX * 0.0 - (t > 6 ? (t - 6) * 30 : 0), t > 6 ? 118 - (t - 6) * 20 : 118, t, t > 6);
    // 둘이 조심스레 걷는다 (카메라와 함께)
    const walk = t * 1.1;
    soldier(g, 176, 150, { pose: 'walk', face: 1, phase: walk, rifle: true });
    soldier(g, 150, 153, { pose: 'walk', face: 1, phase: walk + 0.45, rifle: true, mark: true });
    // 전경 진흙 둔덕
    const fo = -((camX * 1.5) % 120);
    for (let x = fo - 120; x < W + 120; x += 120) {
      disc(g, x + 30, 190, 30, '#2a2018', 0.5);
      disc(g, x + 95, 194, 26, '#231b14', 0.5);
    }
    haze(g, '#8b8d86', 0.12);
  },
};

// ── V. 독일군 참호 ───────────────────────────────────
const BOOM = 7.0;
export const sceneGermanTrench: StoryScene = {
  kind: 'story',
  num: 5,
  title: '독일군 참호',
  en: 'THE GERMAN TRENCH',
  clock: '4월 6일 · 15:10',
  mood: 'dread',
  enter: 'pan',
  duration: 12.5,
  lines: [
    { t: 0.5, who: '블레이크', text: '제대로 지었네. 우리 참호보다 훨씬 낫다.' },
    { t: 4.0, who: '스코필드', text: '쥐다… 고양이만 해.' },
    { t: 8.3, who: '블레이크', text: '스코필드! 눈 떠! 이쪽이야, 이쪽!' },
  ],
  cues: [
    { t: 3.9, fn: (f) => f.audio.squeak() },
    { t: 6.5, fn: (f) => f.audio.squeak() },
    { t: BOOM, fn: (f) => { f.audio.explosion(1); f.shake(9); f.flash(0.9); } },
    { t: BOOM + 0.4, fn: (f) => { f.audio.rumble(4, 0.6); f.shake(5); } },
    { t: BOOM + 2.5, fn: (f) => f.shake(3) },
  ],
  draw(g, t) {
    const camX = Math.min(t, BOOM) * 8;
    // 콘크리트 벙커 내부
    R(g, 0, 0, W, H, '#262624');
    for (let y = 18; y < 150; y += 12) {
      R(g, 0, y, W, 1, '#1d1d1b');
      for (let x = ((y / 12) % 2) * 12 - (camX % 24); x < W; x += 24) R(g, x, y, 1, 12, '#1d1d1b');
    }
    R(g, 0, 0, W, 18, '#161614');
    // 침상과 들보
    for (let i = 0; i < 4; i++) {
      const x = i * 110 - camX + 30;
      R(g, x, 70, 60, 3, '#4b3a28');
      R(g, x, 100, 60, 3, '#4b3a28');
      R(g, x, 60, 3, 90, '#3b2c1e');
      R(g, x + 57, 60, 3, 90, '#3b2c1e');
      R(g, x + 3, 66, 54, 4, '#5a5448');
    }
    // 매달린 전등
    const lx = 150 - camX * 0.5;
    line(g, lx, 18, lx, 38, '#111');
    R(g, lx - 2, 38, 5, 3, '#caa45c');
    const light = t < BOOM ? 1 : 0.45 + 0.2 * Math.sin(t * 40);
    // 바닥
    R(g, 0, 150, W, 30, '#1b1a17');
    duckboard(g, 0, W, 150);
    // 쥐: 왼쪽에서 달려와 인계철선에 걸린다
    const wireX = 250 - camX;
    line(g, wireX, 142, wireX + 30, 150, '#8a8a82');
    if (t > 3.5 && t < BOOM) {
      const rx = lerp(-10, wireX + 6, span(t, 3.6, BOOM - 0.1));
      rat(g, rx, 150, t, 1);
    }
    // 두 사람
    const collapsed = t > BOOM;
    if (!collapsed) {
      const walk = t * 1.2;
      soldier(g, 196 - camX * 0.2, 150, { pose: t < 3.8 ? 'walk' : 'stand', face: t < 3.8 ? 1 : -1, phase: walk, rifle: true });
      soldier(g, 176 - camX * 0.2, 151, { pose: t < 3.8 ? 'walk' : 'stand', face: -1, phase: walk + 0.5, rifle: true, mark: true });
    } else {
      // 무너진 흙더미 아래 스코필드, 블레이크가 끌어낸다
      const pull = span(t, BOOM + 2.5, BOOM + 4.5);
      soldier(g, 170 - camX * 0.2 + pull * 10, 151, { pose: pull > 0.9 ? 'crouch' : 'lie', face: -1, mark: true });
      soldier(g, 196 - camX * 0.2, 150, { pose: 'crouch', face: -1, rifle: true });
      // 흙더미
      for (let i = 0; i < 16; i++) {
        disc(g, 110 + i * 9 - camX * 0.2, 150 - hash(i) * 6 * (1 - pull * 0.6), 7, i % 2 ? '#3b3025' : '#2f271f', 0.6);
      }
      // 천장에서 떨어지는 흙
      for (let i = 0; i < 40; i++) {
        const life = ((t - BOOM) * (0.6 + hash(i) * 0.8) + hash(i * 5)) % 1;
        P(g, hash(i * 9) * W, 18 + life * 132, '#4a3f33');
      }
    }
    // 조명
    const grd = g.createRadialGradient(lx, 42, 2, lx, 42, 190);
    grd.addColorStop(0, `rgba(255,210,130,${0.3 * light})`);
    grd.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    // 폭발과 먼지
    if (t > BOOM) {
      blast(g, wireX + 10, 150, t - BOOM, 5, 1.6);
      const dust = smooth(span(t, BOOM, BOOM + 1.5)) * (1 - span(t, BOOM + 3, BOOM + 4.5) * 0.6) + span(t, BOOM + 4.5, BOOM + 5.5) * 0.9;
      haze(g, '#b6ab98', clamp(dust, 0, 0.95));
    }
  },
};

// ── VI. 벚꽃 농가 ────────────────────────────────────
const CRASH = 9.2;
export const sceneFarm: StoryScene = {
  kind: 'story',
  num: 6,
  title: '벚꽃 농가',
  en: 'THE CHERRY FARM',
  clock: '4월 6일 · 16:30',
  mood: 'pastoral',
  enter: 'flash',
  duration: 15,
  lines: [
    { t: 0.6, who: '블레이크', text: '체리나무야. 놈들이 떠나면서 다 베어 버렸어.' },
    { t: 4.2, who: '블레이크', text: '괜찮아. 씨가 떨어지면 다시 자라. 더 많이.' },
    { t: 7.2, who: '스코필드', text: '저기 봐 — 비행기!' },
    { t: 11.4, who: '블레이크', text: '꺼내 주자! 불에 타 죽겠어!' },
  ],
  cues: [
    { t: 1.0, fn: (f) => f.audio.birds() },
    { t: 6.2, fn: (f) => { f.audio.ambience('plane', 3.4, 0.14); f.audio.machineGun(10, 0.35); } },
    { t: 8.0, fn: (f) => f.audio.machineGun(8, 0.4) },
    { t: CRASH, fn: (f) => { f.audio.explosion(0.9); f.shake(7); f.flash(0.5, '#ffb050'); } },
    { t: CRASH + 0.5, fn: (f) => f.audio.ambience('fire', 5.5, 0.18) },
  ],
  draw(g, t) {
    sky(g, 'farm', [[0, '#9fb5c4'], [0.6, '#d6d7c8'], [1, '#e2dcc4']], 110);
    clouds(g, t, 0, 30, '#e6e8e0', 21, 3, 0.3);
    ridge(g, 0, 0, 104, 12, 0.012, '#8e9a7c', 8);
    // 농가와 헛간
    R(g, 40, 70, 70, 44, '#a99f8a');
    for (let i = 0; i < 36; i++) R(g, 40 + i * 2 - 2, 70 - Math.min(i, 35 - i) * 1.3, 2, Math.min(i, 35 - i) * 1.3, '#6c4e3a');
    R(g, 58, 90, 10, 24, '#3a2e24');
    R(g, 80, 82, 10, 9, '#2e2a26');
    const barnX = 214;
    R(g, barnX, 76, 76, 38, '#6b503a');
    for (let i = 0; i < 38; i++) R(g, barnX + i * 2, 76 - Math.min(i, 37 - i) * 0.9, 2, Math.min(i, 37 - i) * 0.9 + 1, '#4f3a2b');
    for (let x = barnX; x < barnX + 76; x += 5) R(g, x, 76, 1, 38, '#57412f');
    R(g, barnX + 30, 92, 16, 22, '#241b14');
    grassField(g, t, 0, 112, H, '#566136', '#6d7a41', '#8c9a55', ['#f1efe6'], 0.7);
    // 베어진 벚나무들
    felledCherry(g, 130, 132, 3);
    felledCherry(g, 160, 150, 4);
    felledCherry(g, 26, 146, 5);
    cherryTree(g, 186, 124, 40, 9, Math.sin(t) * 0.5);
    // 두 사람
    const run = span(t, 10, 12);
    const bx = lerp(120, barnX + 22, ease(run));
    const sx = lerp(100, barnX + 8, ease(span(t, 10.3, 12.4)));
    soldier(g, bx, 160, { pose: run > 0 && run < 1 ? 'run' : 'stand', face: t > 7 ? 1 : -1, phase: t * 2.4, rifle: true });
    soldier(g, sx, 162, { pose: t > 10.3 && t < 12.4 ? 'run' : 'stand', face: 1, phase: t * 2.4 + 0.5, rifle: true, mark: true });
    // 공중전: 두 대가 지나가고 한 대가 연기를 뿜으며 헛간에 추락
    if (t > 5.8 && t < CRASH) {
      const k = span(t, 5.8, CRASH);
      const p1x = lerp(-30, 360, span(t, 5.8, 8.6));
      plane(g, p1x, 28 + Math.sin(t * 3) * 3, t, 1);
      const px = lerp(-20, barnX + 38, k);
      const py = lerp(40, 96, k * k);
      if (k > 0.35) for (let i = 0; i < 8; i++) disc(g, px - 6 - i * 7, py - 4 - i * 3 * k, 2 + i * 0.6, '#3a3632');
      plane(g, px, py, t, 1, k > 0.35 ? 1 : 0, k * 3);
    }
    if (t > CRASH) {
      blast(g, barnX + 38, 112, t - CRASH, 9, 1.4);
      fire(g, barnX + 38, 114, 50, 26 + Math.sin(t) * 3, t, 2);
      smoke(g, barnX + 38, 86, t, 5, '#2b2723', 1.2, 4);
      plane(g, barnX + 30, 110, t, 1, 1, 4);
    }
    // 꽃잎
    for (let i = 0; i < 18; i++) {
      const life = (t * 0.09 + hash(i * 17)) % 1;
      P(g, (hash(i) * 380 + life * 60 - 30) % W, 60 + life * 120, i % 2 ? PAL.blossom : PAL.blossomD);
    }
  },
};

// ── VII. 블레이크 ────────────────────────────────────
export const sceneBlake: StoryScene = {
  kind: 'story',
  num: 7,
  title: '블레이크',
  en: 'BLAKE',
  clock: '4월 6일 · 16:50',
  mood: 'grief',
  enter: 'fade',
  duration: 17,
  lines: [
    { t: 0.8, text: '추락한 조종사를 끌어낸 순간 — 칼날이 번뜩였다. 총성.' },
    { t: 4.6, who: '블레이크', text: '형한테… 가야 해.' },
    { t: 7.8, who: '스코필드', text: '내가 전할게. 약속해.' },
    { t: 10.8, who: '블레이크', text: '어머니께 편지 써 줘… 내가 무섭지 않았다고.' },
    { t: 14.4, text: '블레이크의 얼굴에서 핏기가 빠져나갔다.' },
  ],
  cues: [{ t: 0.3, fn: (f) => { f.audio.gunshot(0.9); f.shake(3); } }],
  draw(g, t) {
    // 헛간 앞 돌담. 가까이 다가간 구도
    sky(g, 'farm2', [[0, '#a6b4bd'], [1, '#d9d4c0']], 90);
    R(g, 0, 60, W, 30, '#7a7466');
    for (let y = 60; y < 90; y += 6) for (let x = (y % 12) * 1.5; x < W; x += 14) R(g, x, y, 12, 5, hash(x * 3 + y) < 0.5 ? '#8b8475' : '#6f695c');
    grassField(g, t, 0, 90, H, '#566136', '#6d7a41', '#8c9a55', [], 0.5);
    smoke(g, 270, 60, t, 2, '#3d3833', 1.3, 3);
    // 누운 블레이크 (크게: 2배 스케일로 그린다)
    g.save();
    g.translate(160, 150);
    g.scale(2, 2);
    soldier(g, 12, 0, { pose: 'lie', face: -1, bare: true, outline: false });
    soldier(g, -14, 0, { pose: 'kneel', face: 1, rifle: false, mark: true, outline: false });
    g.restore();
    // 흩날리는 벚꽃
    for (let i = 0; i < 26; i++) {
      const life = (t * 0.05 + hash(i * 7)) % 1;
      const x = (hash(i * 3) * 400 - life * 40) % W;
      const y = -10 + life * 200 + Math.sin(t + i) * 5;
      R(g, x, y, 2, 1, i % 2 ? PAL.blossom : PAL.blossomD);
    }
    // 서서히 색이 빠진다 — 죽음
    const drain = smooth(span(t, 9, 16.5));
    if (drain > 0) {
      g.globalCompositeOperation = 'saturation';
      g.globalAlpha = drain;
      R(g, 0, 0, W, H, '#808080');
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
    haze(g, '#000000', drain * 0.25);
  },
};

