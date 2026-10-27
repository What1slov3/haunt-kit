import type { FxStrategy } from '../fx/renderer';

import type { FilterMode } from './image-filters';

/*
 * Режимы фильтра и их свойства — лёгкий модуль, без ядер: его статически импортирует компонент из
 * основного входа кита. Ядра новых режимов и шейдеры грузятся через import() при первом кадре
 * (`render-extended.ts`), поэтому в стартовый чанк приложения попадают только эти таблицы.
 */

/** Режимы шага 10 и дальше README — их ядра загружаются лениво */
export type ExtendedMode =
  | 'floyd'
  | 'atkinson'
  | 'halftone'
  | 'duotone'
  | 'gradient-map'
  | 'posterize'
  | 'threshold'
  | 'braille'
  | 'dot-matrix'
  | 'led'
  | 'crt'
  | 'rgb-split'
  | 'pixel-sort'
  | 'contour'
  | 'edge'
  | 'thermal';

export type FilteredImageMode = FilterMode | ExtendedMode;

/** Настройки режимов; поле читают только режимы, для которых оно указано */
export interface FilteredImageOptions {
  /** halftone: угол растра, градусы (монохром — 45, цветной — смещение к углам CMYK) */
  angle?: number;
  /** halftone: точки или линии */
  shape?: 'dot' | 'line';
  /** halftone: монохром из палитры темы или цветной — CMYK на светлом фоне, RGB-растры на тёмном */
  channels?: 'mono' | 'cmyk';
  /** posterize — ступеней на канал (4), contour — изолиний (8), dot-matrix / led — ступеней яркости (5) */
  levels?: number;
  /** threshold — порог яркости 0…1 (по умолчанию — средняя яркость кадра); pixel-sort — нижняя граница сортируемой яркости (0.25) */
  threshold?: number;
  /** pixel-sort: полосы по строкам или «стекают» по столбцам */
  direction?: 'horizontal' | 'vertical';
  /**
   * duotone / gradient-map: цвета шкалы от теней к светам — токены (`'--accent'`) или CSS-цвета.
   * По умолчанию — из `--image-dither-*`, по правилу «яркость = краска»
   */
  colors?: readonly string[];
}

export const FILTER_MODES: readonly FilteredImageMode[] = [
  'pixel',
  'dither',
  'ascii',
  'floyd',
  'atkinson',
  'halftone',
  'duotone',
  'gradient-map',
  'posterize',
  'threshold',
  'braille',
  'dot-matrix',
  'led',
  'crt',
  'rgb-split',
  'pixel-sort',
  'contour',
  'edge',
  'thermal',
];

/**
 * Ячейка по умолчанию, CSS px. Смысл у режима свой: размер пикселя или точки (pixel, dither, floyd,
 * dot-matrix), кегль символа (ascii, braille), шаг растра (halftone), шаг развёртки (crt), сдвиг
 * каналов (rgb-split), шаг сетки изолиний (contour), детальность обработки (тона, edge).
 */
export const DEFAULT_CELL: Record<FilteredImageMode, number> = {
  pixel: 8,
  dither: 3,
  ascii: 10,
  floyd: 3,
  atkinson: 3,
  halftone: 6,
  duotone: 1,
  'gradient-map': 1,
  posterize: 2,
  threshold: 2,
  braille: 10,
  'dot-matrix': 6,
  led: 6,
  crt: 3,
  'rgb-split': 4,
  'pixel-sort': 2,
  contour: 5,
  edge: 1.5,
  thermal: 1,
};

const BASE_MODES = new Set<FilteredImageMode>(['pixel', 'dither', 'ascii']);

export function isExtendedMode(mode: FilteredImageMode): mode is ExtendedMode {
  return !BASE_MODES.has(mode);
}

/**
 * Где шейдер выгоден: попиксельная работа на полном разрешении (развёртка, растр, сдвиг каналов, Собель,
 * карты цвета) — на GPU это доли миллисекунды, на CPU — десятки на кадр видео. Дизеринг диффузией,
 * сортировка и изолинии последовательны по своей природе, им шейдер не помогает — только Canvas 2D.
 */
const WEBGL_MODES = new Set<FilteredImageMode>([
  'crt',
  'rgb-split',
  'halftone',
  'edge',
  'thermal',
  'duotone',
  'gradient-map',
]);

/** Стратегия режима: у всех есть ядро на CPU, у части — шейдер; static — один кадр без движения */
export function modeStrategy(mode: FilteredImageMode): FxStrategy<true> {
  return WEBGL_MODES.has(mode)
    ? { webgl: true, canvas2d: true, static: true }
    : { canvas2d: true, static: true };
}
