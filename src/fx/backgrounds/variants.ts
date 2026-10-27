import type { FxStrategy } from '../renderer';

import type { BackgroundScene, SceneOptions } from './scene';

/*
 * Реестр фонов: пути рендера, частота кадров и ленивые загрузчики сцен. Лёгкий модуль — его читает
 * хост при выборе пути; сами сцены и шейдеры — только через import().
 */

export const FX_BACKGROUNDS = [
  'flow',
  'contour',
  'rain',
  'constellation',
  'radar',
  'waveform',
  'hex',
  'life',
  'mesh',
  'starfield',
] as const;

export type FxBackgroundVariant = (typeof FX_BACKGROUNDS)[number];

/*
 * Шейдер — только там, где он честно выигрывает: на каждый пиксель считается поле (шум горизонталей,
 * трассировка потока, звёзды по ячейкам, градиент сетки). Остальным хватает Canvas 2D — несколько
 * сотен примитивов на кадр, GPU-проход и копия кадра стоили бы дороже.
 */
const GPU: ReadonlySet<FxBackgroundVariant> = new Set(['flow', 'contour', 'mesh', 'starfield']);

export function backgroundStrategy(variant: FxBackgroundVariant): FxStrategy<true> {
  return GPU.has(variant)
    ? { webgl: true, canvas2d: true, static: true }
    : { canvas2d: true, static: true };
}

/**
 * Потолок частоты кадров: медленным фонам 60 Гц не нужны — дождь, автомат и горизонтали плывут на
 * 20–30 кадрах так же гладко, а цена кадра падает вдвое-втрое.
 */
export const BACKGROUND_FPS: Partial<Record<FxBackgroundVariant, number>> = {
  rain: 20,
  life: 24,
  contour: 30,
  radar: 30,
  hex: 30,
};

export type SceneFactory = (canvas: HTMLCanvasElement, options: SceneOptions) => BackgroundScene;

/** Сцены Canvas 2D: каждая — свой чанк */
export const canvasScenes: Record<
  FxBackgroundVariant,
  () => Promise<{ createScene: SceneFactory }>
> = {
  flow: () => import('./scenes/flow-scene'),
  contour: () => import('./scenes/contour-scene'),
  rain: () => import('./scenes/rain-scene'),
  constellation: () => import('./scenes/constellation-scene'),
  radar: () => import('./scenes/radar-scene'),
  waveform: () => import('./scenes/waveform-scene'),
  hex: () => import('./scenes/hex-scene'),
  life: () => import('./scenes/life-scene'),
  mesh: () => import('./scenes/mesh-scene'),
  starfield: () => import('./scenes/starfield-scene'),
};

/** Шейдерные сцены и общий WebGL-контекст — отдельным чанком, только если выбран путь webgl */
export const loadGlScenes = () => import('./gl-scenes');
