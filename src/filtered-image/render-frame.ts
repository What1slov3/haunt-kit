import {
  asciiGrid,
  ASCII_RAMP,
  coverRect,
  ditherPixels,
  gridSize,
  inkRamp,
  type Rgb,
} from './image-filters';
import type { FilteredImageMode, FilteredImageOptions } from './modes';

/*
 * Рисующий слой фильтра: уменьшить исходник до сетки ячеек, обработать пиксели (image-filters.ts) и
 * растянуть результат на холст без сглаживания. Кадр — отдельный canvas: его кэширует frame-cache.ts,
 * а компонент только копирует его на видимый холст. Для покадровой отрисовки (GIF, видео) холсты
 * передаются снаружи и переиспользуются — новый canvas на каждый кадр дал бы десятки мегабайт мусора
 * в секунду.
 */

export interface FrameParams {
  mode: FilteredImageMode;
  /** Размер рамки в CSS px */
  width: number;
  height: number;
  devicePixelRatio: number;
  /** Ячейка в CSS px: пиксель, точка дизеринга или кегль символа ASCII */
  cell: number;
  /** Цвета дизеринга в любом порядке: шкалу краски от фона строит inkRamp */
  palette: readonly Rgb[];
  /** Цвет фона: подкладывается под прозрачные места исходника и под символы ASCII */
  background: Rgb;
  /** Цвет символов ASCII */
  foreground: Rgb;
  /** Семейство моно-шрифта для ASCII — значение `--font-mono` */
  fontFamily: string;
  /** Настройки новых режимов (угол растра, уровни, порог…) — их читает `render-extended.ts` */
  options?: FilteredImageOptions;
  /** Свои цвета шкалы (`options.colors`), уже в байтах; без них шкала строится из палитры темы */
  colors?: readonly Rgb[];
}

/** Холсты для повторного использования: сетка ячеек и готовый кадр. Пустые поля заполняются при первом кадре */
export interface FrameSurfaces {
  grid?: HTMLCanvasElement;
  frame?: HTMLCanvasElement;
  /** Промежуточный холст новых режимов: исходник в размер рамки, точки табло до маски */
  work?: HTMLCanvasElement;
  /** Уменьшенная копия исходника для свечения CRT */
  glow?: HTMLCanvasElement;
  /**
   * Кадр шейдера — свой холст: у `frame` контекст с willReadFrequently (он в памяти CPU), и копия из
   * WebGL в него на каждом кадре видео стоила бы чтения пикселей с GPU
   */
  shader?: HTMLCanvasElement;
}

/** Ширина символа моно-шрифта к кеглю: у JetBrains Mono 0.6, у системных моно — так же с точностью до пикселя */
export const MONO_ADVANCE = 0.6;
/** Высота строки ASCII к кеглю: плотнее обычного текста, чтобы ряды не распадались на полосы */
export const ASCII_LINE = 1.1;

/** Холст нужного размера: переиспользуемый из surfaces[slot] или новый. Смена размера очищает холст сама */
export function canvasFor(
  surfaces: FrameSurfaces | undefined,
  slot: keyof FrameSurfaces,
  width: number,
  height: number,
): HTMLCanvasElement {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const canvas = surfaces?.[slot] ?? document.createElement('canvas');

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  if (surfaces) surfaces[slot] = canvas;

  return canvas;
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  // willReadFrequently: сетку читаем через getImageData — без флага Chromium держит её на GPU и читает медленно
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) throw new Error('FilteredImage: canvas 2D недоступен');

  // Переиспользуемый холст помнит трансформацию и прозрачность прошлого кадра
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;

  return ctx;
}

export const rgb = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`;

/**
 * Уменьшение до сетки: drawImage с высоким качеством сглаживания усредняет область под каждой
 * ячейкой. Фон подкладывается заранее — прозрачные места исходника иначе стали бы «чёрными» нулями.
 */
export function sampleGrid(
  image: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
  frame: { width: number; height: number; background: Rgb },
  cellWidth: number,
  cellHeight: number,
  surfaces?: FrameSurfaces,
) {
  const { cols, rows } = gridSize(frame.width, frame.height, cellWidth, cellHeight);
  const grid = canvasFor(surfaces, 'grid', cols, rows);
  const ctx = context2d(grid);
  // Сетка с неполной ячейкой у края шире рамки: берём из исходника чуть больше, чтобы не тянуть картинку
  const rect = coverRect(naturalWidth, naturalHeight, cols * cellWidth, rows * cellHeight);

  ctx.fillStyle = rgb(frame.background);
  ctx.fillRect(0, 0, cols, rows);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, cols, rows);

  return { grid, ctx, cols, rows, data: ctx.getImageData(0, 0, cols, rows) };
}

export function upscale(
  grid: HTMLCanvasElement,
  cols: number,
  rows: number,
  size: DeviceSize,
  surfaces?: FrameSurfaces,
) {
  const frame = canvasFor(surfaces, 'frame', size.width, size.height);
  const ctx = context2d(frame);

  // Без сглаживания: каждая ячейка остаётся чётким квадратом, а не размытым пятном
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, frame.width, frame.height);
  ctx.drawImage(grid, 0, 0, cols, rows, 0, 0, cols * size.cell, rows * size.cell);

  return frame;
}

export interface DeviceSize {
  width: number;
  height: number;
  cell: number;
}

/*
 * Пиксели и точки дизеринга считаются в физических пикселях экрана: ячейка 3 CSS px при масштабе
 * 125 % — это 3.75 px, и без округления соседние ячейки выходили бы по 3 и 4 px — заметная рябь.
 */
export function deviceSize(params: FrameParams): DeviceSize {
  const scale = params.devicePixelRatio;

  return {
    width: Math.max(1, Math.round(params.width * scale)),
    height: Math.max(1, Math.round(params.height * scale)),
    cell: Math.max(1, Math.round(params.cell * scale)),
  };
}

function renderAscii(
  image: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
  params: FrameParams,
  surfaces?: FrameSurfaces,
) {
  const fontSize = params.cell;
  const cellWidth = fontSize * MONO_ADVANCE;
  const cellHeight = fontSize * ASCII_LINE;
  const { data, cols, rows } = sampleGrid(
    image,
    naturalWidth,
    naturalHeight,
    params,
    cellWidth,
    cellHeight,
    surfaces,
  );
  const ascii = asciiGrid(data.data, cols, rows);
  const scale = params.devicePixelRatio;
  const frame = canvasFor(surfaces, 'frame', params.width * scale, params.height * scale);
  const ctx = context2d(frame);
  const levels = ASCII_RAMP.length - 1;

  ctx.clearRect(0, 0, frame.width, frame.height);
  ctx.scale(scale, scale);
  ctx.font = `${fontSize}px ${params.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = rgb(params.foreground);

  // Прозрачность — по ступеням набора: десять смен globalAlpha вместо смены цвета на каждом символе
  for (let level = 1; level <= levels; level++) {
    const char = ASCII_RAMP[level]!;

    ctx.globalAlpha = 0.3 + (0.7 * level) / levels;

    for (let y = 0; y < rows; y++) {
      const row = ascii.rows[y]!;

      for (let x = 0; x < cols; x++) {
        if (row[x] === char) ctx.fillText(char, x * cellWidth, y * cellHeight);
      }
    }
  }

  return frame;
}

/** Готовый кадр фильтра размером рамки × devicePixelRatio; с `surfaces` — в переиспользуемый холст */
export function renderFrame(
  image: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
  params: FrameParams,
  surfaces?: FrameSurfaces,
): HTMLCanvasElement {
  if (params.mode === 'ascii') {
    return renderAscii(image, naturalWidth, naturalHeight, params, surfaces);
  }

  const size = deviceSize(params);
  const { grid, ctx, data, cols, rows } = sampleGrid(
    image,
    naturalWidth,
    naturalHeight,
    { width: size.width, height: size.height, background: params.background },
    size.cell,
    size.cell,
    surfaces,
  );

  if (params.mode === 'dither') {
    const pixels = ditherPixels(data.data, cols, rows, inkRamp(params.palette, params.background));

    data.data.set(pixels);
    ctx.putImageData(data, 0, 0);
  }

  return upscale(grid, cols, rows, size, surfaces);
}

/** Исходник «как есть» в размер рамки — его показывает линза под курсором */
export function renderOriginal(
  image: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
  params: Pick<FrameParams, 'width' | 'height' | 'devicePixelRatio'>,
  surfaces?: FrameSurfaces,
): HTMLCanvasElement {
  const scale = params.devicePixelRatio;
  const frame = canvasFor(surfaces, 'frame', params.width * scale, params.height * scale);
  const ctx = context2d(frame);
  const rect = coverRect(naturalWidth, naturalHeight, frame.width, frame.height);

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, frame.width, frame.height);

  return frame;
}
