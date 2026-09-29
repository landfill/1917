import type { Ctx } from '../core/gfx';
import type { AudioEngine, Mood } from '../core/audio';

/**
 * 장면 전환 방식.
 * pan   — 카메라가 멈추지 않고 옆으로 흘러가는 '원 테이크' 전환
 * tilt  — 카메라가 위아래로 흐르는 전환
 * flash — 폭발 섬광으로 하얗게 날아가는 전환
 * cut   — 영화에서 단 한 번뿐인 암전 (컷)
 * drain — 색이 빠져나가며 흑백으로 가라앉는 전환
 * flare — 주황 조명탄 빛이 번지며 밝아지는 전환
 * water — 물결 일렁임으로 녹아드는 전환
 * iris  — 원형으로 조여들며 닫히는 전환
 * fade  — 검은 화면을 거치는 부드러운 전환
 */
export type Transition = 'pan' | 'tilt' | 'flash' | 'cut' | 'drain' | 'flare' | 'water' | 'iris' | 'fade';

export interface FxApi {
  audio: AudioEngine;
  shake(n: number): void;
  flash(n: number, color?: string): void;
}

export interface Line {
  t: number;
  text: string;
  who?: string;
}

export interface Cue {
  t: number;
  fn: (fx: FxApi) => void;
}

export interface StoryScene {
  kind: 'story';
  num: number;
  title: string;
  en: string;
  /** 영화 속 시각 */
  clock: string;
  mood: Mood;
  enter: Transition;
  duration: number;
  lines: Line[];
  cues: Cue[];
  /** 순수 함수처럼: 같은 t면 같은 그림 */
  draw(g: Ctx, t: number): void;
}

export interface InputState {
  x: number;
  y: number;
  sprint: boolean;
}

export interface GameScene {
  kind: 'game';
  num: number;
  title: string;
  en: string;
  clock: string;
  mood: Mood;
  enter: Transition;
  reset(fx: FxApi, fails: number): void;
  update(dt: number, input: InputState, fx: FxApi): 'play' | 'win' | 'lose';
  draw(g: Ctx, t: number): void;
  /** HUD에 보여줄 상태 */
  status(): { time: number; limit: number; progress: number; hp: number; maxHp: number; stamina: number; reason: string; started: boolean };
}

export type Scene = StoryScene | GameScene;
