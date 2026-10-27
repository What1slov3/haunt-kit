import type { FxRenderer } from '../fx/environment';
import { brailleRows } from '../fx/kernels/braille';
import { diffuseError } from '../fx/kernels/error-diffusion';
import { halftonePixels } from '../fx/kernels/halftone';
import { isolines, luminanceField } from '../fx/kernels/marching-squares';
import { pixelSort } from '../fx/kernels/pixel-sort';
import { crtPixels, rgbSplit } from '../fx/kernels/screen';
import { edgeStrength, sobel } from '../fx/kernels/sobel';
import {
  gradientMap,
  ledPixels,
  meanLuminance,
  posterize,
  sampleRamp,
  thresholdPixels,
  THERMAL_RAMP,
} from '../fx/kernels/tone';
import type * as Shaders from '../fx/shaders/filter-shaders';
import type * as GlRuntime from '../fx/webgl/shared-context';
import type { ShaderPass } from '../fx/webgl/shared-context';

import { coverRect, inkRamp, luminance, type Rgb } from './image-filters';
import type { ExtendedMode } from './modes';
import {
  ASCII_LINE,
  canvasFor,
  context2d,
  deviceSize,
  MONO_ADVANCE,
  rgb,
  sampleGrid,
  type DeviceSize,
  type FrameParams,
  type FrameSurfaces,
} from './render-frame';

/*
 * Рисующий слой новых режимов (шаг 10 и дальше README). Модуль загружается через import() при первом
 * кадре такого режима — ядра в стартовый чанк не попадают. Шейдеры и общий WebGL-контекст — ещё одна
 * ступень: грузятся, только если режим выбрал путь WebGL (`prepareExtended('webgl')`).
 *
 * Каждый режим — CPU-ядро из `fx/kernels`; у части есть шейдер (`fx/shaders/filter-shaders.ts`). Если
 * проход шейдера не удался (контекст потерян, программа не собралась), кадр сразу считается на CPU — и
 * результат говорит, каким путём он получен.
 */

export interface ExtendedResult {
  frame: HTMLCanvasElement;
  /** Путь, которым кадр получен на самом деле: шейдер мог отказать, тогда — canvas */
  renderer: FxRenderer;
}

export type ExtendedRender = (
  image: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
  params: FrameParams,
  surfaces?: FrameSurfaces,
) => ExtendedResult;

type Grid = ReturnType<typeof sampleGrid>;

function ramp(params: FrameParams): Rgb[] {
  return inkRamp(params.palette, params.background);
}

/** Шкала цветов тональных режимов: свои цвета, тепловая палитра или краска темы */
function toneRamp(mode: ExtendedMode, params: FrameParams): readonly Rgb[] {
  if (mode === 'thermal') return THERMAL_RAMP;

  if (params.colors && params.colors.length >= 2) return params.colors;

  const ink = ramp(params);

  // Дуотон: смесь акцента с фоном в тенях, текст акцента в светах — не плоская заливка одним акцентом
  return mode === 'duotone' ? [ink[1]!, ink[ink.length - 1]!] : ink;
}

function grid(
  image: CanvasImageSource,
  w: number,
  h: number,
  size: DeviceSize,
  params: FrameParams,
  surfaces?: FrameSurfaces,
): Grid {
  return sampleGrid(
    image,
    w,
    h,
    { width: size.width, height: size.height, background: params.background },
    size.cell,
    size.cell,
    surfaces,
  );
}

/** Сетку с обработанными пикселями — на кадр: чётко (ячейки) или сглаженно (тона, контур) */
function finish(
  result: Grid,
  pixels: Uint8ClampedArray,
  size: DeviceSize,
  smooth: boolean,
  surfaces?: FrameSurfaces,
) {
  result.data.data.set(pixels);
  result.ctx.putImageData(result.data, 0, 0);

  const frame = canvasFor(surfaces, 'frame', size.width, size.height);
  const ctx = context2d(frame);

  ctx.imageSmoothingEnabled = smooth;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, frame.width, frame.height);
  ctx.drawImage(
    result.grid,
    0,
    0,
    result.cols,
    result.rows,
    0,
    0,
    result.cols * size.cell,
    result.rows * size.cell,
  );

  return frame;
}

/** Исходник в размер рамки (cover) с фоном под прозрачным — вход «экранных» ядер на полном разрешении */
function fullFrame(
  image: CanvasImageSource,
  w: number,
  h: number,
  size: DeviceSize,
  params: FrameParams,
  surfaces?: FrameSurfaces,
) {
  const work = canvasFor(surfaces, 'work', size.width, size.height);
  const ctx = context2d(work);
  const rect = coverRect(w, h, size.width, size.height);

  ctx.fillStyle = rgb(params.background);
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, size.width, size.height);

  return ctx.getImageData(0, 0, size.width, size.height);
}

function putFrame(pixels: Uint8ClampedArray, size: DeviceSize, surfaces?: FrameSurfaces) {
  const frame = canvasFor(surfaces, 'frame', size.width, size.height);

  context2d(frame).putImageData(
    new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, size.width, size.height),
    0,
    0,
  );

  return frame;
}

const dotPatterns = new Map<number, HTMLCanvasElement>();

/** Плитка с кругом на ячейку табло: маска `destination-in` вырезает из сетки круглые диоды */
function dotPattern(cell: number): HTMLCanvasElement {
  let tile = dotPatterns.get(cell);

  if (tile) return tile;

  tile = document.createElement('canvas');
  tile.width = cell;
  tile.height = cell;

  const ctx = tile.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cell / 2, cell / 2, cell * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  dotPatterns.set(cell, tile);

  return tile;
}

function renderLed(
  mode: 'dot-matrix' | 'led',
  image: CanvasImageSource,
  w: number,
  h: number,
  params: FrameParams,
  surfaces?: FrameSurfaces,
) {
  const size = deviceSize(params);
  const sampled = grid(image, w, h, size, params, surfaces);
  const ink = ramp(params);
  // Цветное табло — всегда тёмное: на светлом «выключенном» диоде цвета выцветают в пастель
  const darkest =
    luminance(...ink[0]!) < luminance(...ink[ink.length - 1]!) ? ink[0]! : ink[ink.length - 1]!;
  const off = mode === 'led' ? darkest : ink[0]!;
  const pixels = ledPixels(sampled.data.data, sampled.cols, sampled.rows, {
    ink: mode === 'dot-matrix' ? ink[ink.length - 1]! : null,
    off,
    levels: params.options?.levels ?? 5,
  });

  sampled.data.data.set(pixels);
  sampled.ctx.putImageData(sampled.data, 0, 0);

  // Диоды: сетка растянута без сглаживания в work и вырезана кругами
  const work = canvasFor(surfaces, 'work', size.width, size.height);
  const wctx = context2d(work);

  wctx.imageSmoothingEnabled = false;
  wctx.globalCompositeOperation = 'source-over';
  wctx.clearRect(0, 0, work.width, work.height);
  wctx.drawImage(
    sampled.grid,
    0,
    0,
    sampled.cols,
    sampled.rows,
    0,
    0,
    sampled.cols * size.cell,
    sampled.rows * size.cell,
  );

  const pattern = wctx.createPattern(dotPattern(size.cell), 'repeat');

  if (pattern) {
    wctx.globalCompositeOperation = 'destination-in';
    wctx.fillStyle = pattern;
    wctx.fillRect(0, 0, work.width, work.height);
    wctx.globalCompositeOperation = 'source-over';
  }

  const frame = canvasFor(surfaces, 'frame', size.width, size.height);
  const ctx = context2d(frame);

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgb(off);
  ctx.fillRect(0, 0, frame.width, frame.height);

  // Ореол — размытая копия диодов, сложенная светом. Без ctx.filter (Safari до 18) — без ореола:
  // резкая копия в 'lighter' просто пересветила бы кадр
  if (mode === 'led' && typeof ctx.filter === 'string') {
    ctx.filter = `blur(${Math.max(1, size.cell * 0.5)}px)`;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.65;
    ctx.drawImage(work, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.drawImage(work, 0, 0);

  return frame;
}

function renderBraille(
  image: CanvasImageSource,
  w: number,
  h: number,
  params: FrameParams,
  surfaces?: FrameSurfaces,
) {
  const fontSize = params.cell;
  const cellWidth = fontSize * MONO_ADVANCE;
  const cellHeight = fontSize * ASCII_LINE;
  // Сетка точек: два столбца и четыре ряда на знакоместо
  const dots = sampleGrid(image, w, h, params, cellWidth / 2, cellHeight / 4, surfaces);
  const rows = brailleRows(dots.data.data, dots.cols, dots.rows);
  const scale = params.devicePixelRatio;
  const frame = canvasFor(surfaces, 'frame', params.width * scale, params.height * scale);
  const ctx = context2d(frame);

  ctx.clearRect(0, 0, frame.width, frame.height);
  ctx.scale(scale, scale);
  ctx.font = `${fontSize}px ${params.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = rgb(params.foreground);

  // По знаку, а не строкой: если в шрифте нет Брайля, у запасного шрифта другая ширина — сетка не плывёт
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]!;

    for (let x = 0; x < row.length; x++) {
      const char = row[x]!;

      if (char !== '⠀') ctx.fillText(char, x * cellWidth, y * cellHeight);
    }
  }

  return frame;
}

function renderContour(
  image: CanvasImageSource,
  w: number,
  h: number,
  params: FrameParams,
  surfaces?: FrameSurfaces,
) {
  const size = deviceSize(params);
  const sampled = grid(image, w, h, size, params, surfaces);
  const field = luminanceField(sampled.data.data, sampled.cols, sampled.rows);
  const levels = Math.max(1, Math.round(params.options?.levels ?? 8));
  const ink = ramp(params);
  const frame = canvasFor(surfaces, 'frame', size.width, size.height);
  const ctx = context2d(frame);
  const scale = params.devicePixelRatio;

  ctx.clearRect(0, 0, frame.width, frame.height);
  ctx.lineCap = 'round';

  for (let level = 1; level <= levels; level++) {
    const segments = isolines(field, sampled.cols, sampled.rows, level / (levels + 1));
    // Каждая четвёртая — «утолщённая горизонталь», как на топокарте
    const major = level % 4 === 0;

    ctx.strokeStyle = rgb(major ? ink[ink.length - 1]! : ink[Math.min(2, ink.length - 1)]!);
    ctx.lineWidth = (major ? 1.6 : 1) * scale;
    ctx.beginPath();

    // Узел сетки — центр своей ячейки
    for (let i = 0; i < segments.length; i += 4) {
      ctx.moveTo((segments[i]! + 0.5) * size.cell, (segments[i + 1]! + 0.5) * size.cell);
      ctx.lineTo((segments[i + 2]! + 0.5) * size.cell, (segments[i + 3]! + 0.5) * size.cell);
    }

    ctx.stroke();
  }

  return frame;
}

function renderCrt(
  image: CanvasImageSource,
  w: number,
  h: number,
  params: FrameParams,
  surfaces?: FrameSurfaces,
) {
  const size = deviceSize(params);
  const frameData = fullFrame(image, w, h, size, params, surfaces);
  // Свечение: исходник в 8 раз меньше — сглаживание при уменьшении и есть размытие
  const glowWidth = Math.max(1, Math.round(size.width / 8));
  const glowHeight = Math.max(1, Math.round(size.height / 8));
  const glow = canvasFor(surfaces, 'glow', glowWidth, glowHeight);
  const gctx = context2d(glow);

  gctx.imageSmoothingEnabled = true;
  gctx.imageSmoothingQuality = 'high';
  gctx.drawImage(canvasFor(surfaces, 'work', size.width, size.height), 0, 0, glowWidth, glowHeight);

  const pixels = crtPixels(
    frameData.data,
    {
      data: gctx.getImageData(0, 0, glowWidth, glowHeight).data,
      width: glowWidth,
      height: glowHeight,
    },
    size.width,
    size.height,
    { pitch: size.cell, curvature: 0.08, background: params.background },
  );

  return putFrame(pixels, size, surfaces);
}

function renderCpu(
  mode: ExtendedMode,
  image: CanvasImageSource,
  w: number,
  h: number,
  params: FrameParams,
  surfaces?: FrameSurfaces,
): HTMLCanvasElement {
  const size = deviceSize(params);
  const ink = ramp(params);

  switch (mode) {
    case 'floyd':
    case 'atkinson': {
      const sampled = grid(image, w, h, size, params, surfaces);

      return finish(
        sampled,
        diffuseError(sampled.data.data, sampled.cols, sampled.rows, ink, mode),
        size,
        false,
        surfaces,
      );
    }

    case 'posterize': {
      const sampled = grid(image, w, h, size, params, surfaces);

      return finish(
        sampled,
        posterize(sampled.data.data, sampled.cols, sampled.rows, params.options?.levels ?? 4),
        size,
        false,
        surfaces,
      );
    }

    case 'threshold': {
      const sampled = grid(image, w, h, size, params, surfaces);
      // Порог по умолчанию — средняя яркость кадра: ч/б делится поровну на любой картинке
      const threshold =
        params.options?.threshold ?? meanLuminance(sampled.data.data, sampled.cols, sampled.rows);
      const pixels = thresholdPixels(
        sampled.data.data,
        sampled.cols,
        sampled.rows,
        threshold,
        ink[0]!,
        ink[ink.length - 1]!,
      );

      return finish(sampled, pixels, size, false, surfaces);
    }

    case 'duotone':
    case 'gradient-map':
    case 'thermal': {
      const sampled = grid(image, w, h, size, params, surfaces);

      return finish(
        sampled,
        gradientMap(sampled.data.data, sampled.cols, sampled.rows, toneRamp(mode, params)),
        size,
        true,
        surfaces,
      );
    }

    case 'pixel-sort': {
      const sampled = grid(image, w, h, size, params, surfaces);
      const pixels = pixelSort(sampled.data.data, sampled.cols, sampled.rows, {
        low: params.options?.threshold ?? 0.25,
        high: 0.85,
        vertical: params.options?.direction === 'vertical',
      });

      return finish(sampled, pixels, size, false, surfaces);
    }

    case 'edge': {
      const sampled = grid(image, w, h, size, params, surfaces);
      const magnitude = sobel(
        luminanceField(sampled.data.data, sampled.cols, sampled.rows),
        sampled.cols,
        sampled.rows,
      );
      const pixels = new Uint8ClampedArray(sampled.cols * sampled.rows * 4);

      for (let p = 0; p < magnitude.length; p++) {
        sampleRamp(ink, edgeStrength(magnitude[p]!), pixels, p * 4);
        pixels[p * 4 + 3] = 255;
      }

      return finish(sampled, pixels, size, true, surfaces);
    }

    case 'halftone': {
      const sampled = grid(image, w, h, size, params, surfaces);
      const channels = params.options?.channels ?? 'mono';
      const pixels = halftonePixels(
        { data: sampled.data.data, width: sampled.cols, height: sampled.rows },
        size.width,
        size.height,
        {
          period: size.cell,
          angle: ((params.options?.angle ?? (channels === 'mono' ? 45 : 0)) * Math.PI) / 180,
          shape: params.options?.shape ?? 'dot',
          channels,
          paper: ink[0]!,
          ink: ink[ink.length - 1]!,
        },
      );

      return putFrame(pixels, size, surfaces);
    }

    case 'rgb-split':
      return putFrame(
        rgbSplit(
          fullFrame(image, w, h, size, params, surfaces).data,
          size.width,
          size.height,
          size.cell,
        ),
        size,
        surfaces,
      );

    case 'crt':
      return renderCrt(image, w, h, params, surfaces);

    case 'dot-matrix':
    case 'led':
      return renderLed(mode, image, w, h, params, surfaces);

    case 'braille':
      return renderBraille(image, w, h, params, surfaces);

    case 'contour':
      return renderContour(image, w, h, params, surfaces);
  }
}

const MAX_RAMP = 8;

/** Проход шейдера для режима или null — у режима нет шейдера */
function shaderPass(
  shaders: typeof Shaders,
  mode: ExtendedMode,
  image: CanvasImageSource,
  w: number,
  h: number,
  params: FrameParams,
): ShaderPass | null {
  const size = deviceSize(params);
  const rect = coverRect(w, h, size.width, size.height);
  const colors = mode === 'halftone' || mode === 'edge' ? ramp(params) : toneRamp(mode, params);
  const flat = new Float32Array(MAX_RAMP * 3);
  const count = Math.min(MAX_RAMP, colors.length);

  colors
    .slice(0, count)
    .forEach((color, i) => flat.set([color[0] / 255, color[1] / 255, color[2] / 255], i * 3));

  const common = {
    u_sourceSize: [w, h],
    u_crop: [rect.sx / w, rect.sy / h, rect.sw / w, rect.sh / h],
    u_resolution: [size.width, size.height],
    u_cell: size.cell,
    u_background: params.background.map((c) => c / 255),
    u_ramp: flat,
    u_rampSize: count,
  };
  const pass = (
    program: string,
    fragment: string,
    uniforms: ShaderPass['uniforms'] = {},
  ): ShaderPass => ({
    program,
    fragment,
    width: size.width,
    height: size.height,
    textures: { u_image: { source: image as TexImageSource, mipmaps: true } },
    uniforms: { ...common, ...uniforms },
  });

  switch (mode) {
    case 'duotone':
    case 'gradient-map':
    case 'thermal':
      return pass('filter:gradient-map', shaders.GRADIENT_MAP);
    case 'edge':
      return pass('filter:edge', shaders.EDGE, { u_gain: 1 });
    case 'halftone': {
      const channels = params.options?.channels ?? 'mono';

      return pass('filter:halftone', shaders.HALFTONE, {
        u_angle: ((params.options?.angle ?? (channels === 'mono' ? 45 : 0)) * Math.PI) / 180,
        u_shape: params.options?.shape === 'line' ? 1 : 0,
        u_channels: channels === 'mono' ? 0 : 1,
        // На тёмной бумаге растры складываются светом — как в CPU-ядре
        u_additive:
          (colors[0]![0] * 0.2126 + colors[0]![1] * 0.7152 + colors[0]![2] * 0.0722) / 255 < 0.5,
      });
    }
    case 'crt':
      return pass('filter:crt', shaders.CRT, { u_curvature: 0.08 });
    case 'rgb-split':
      return pass('filter:rgb-split', shaders.RGB_SPLIT);
    default:
      return null;
  }
}

function makeRender(
  gl: { runtime: typeof GlRuntime; shaders: typeof Shaders } | null,
): ExtendedRender {
  return (image, w, h, params, surfaces) => {
    const mode = params.mode as ExtendedMode;

    if (gl) {
      const pass = shaderPass(gl.shaders, mode, image, w, h, params);

      if (pass) {
        const size = deviceSize(params);
        const frame = canvasFor(surfaces, 'shader', size.width, size.height);

        if (gl.runtime.renderShaderPass(frame, pass)) return { frame, renderer: 'webgl' };
      }
    }

    return { frame: renderCpu(mode, image, w, h, params, surfaces), renderer: 'canvas' };
  };
}

const cpuRender = makeRender(null);
let glRender: Promise<ExtendedRender> | null = null;

/**
 * Рендер новых режимов для выбранного пути. Для `webgl` догружает общий контекст и шейдеры (один раз на
 * страницу); для canvas и static — только CPU-ядра этого модуля.
 */
export function prepareExtended(renderer: FxRenderer): Promise<ExtendedRender> {
  if (renderer !== 'webgl') return Promise.resolve(cpuRender);

  glRender ??= Promise.all([
    import('../fx/webgl/shared-context'),
    import('../fx/shaders/filter-shaders'),
  ]).then(([runtime, shaders]) => makeRender({ runtime, shaders }));

  return glRender;
}
