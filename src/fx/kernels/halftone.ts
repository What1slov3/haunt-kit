import { luminance, type Rgb } from '../../filtered-image/image-filters';

/*
 * Растр, как в печати: изображение — сетка точек (или линий), повёрнутая на угол; размер точки — сколько
 * «краски» в этом месте. Тот же расчёт делает шейдер `halftone` (fx/shaders) — здесь запасной путь на CPU.
 *
 * Для каждого пикселя рамки: координаты поворачиваются на угол растра и делятся на шаг — так видно, в
 * какой ячейке растра пиксель и где её центр. Цвет берётся в центре ячейки (из сетки, уменьшенной до
 * шага растра, билинейно), а пиксель закрашен, если он ближе к центру, чем радиус точки этой ячейки.
 */

export interface HalftoneOptions {
  /** Шаг растра в пикселях результата */
  period: number;
  /** Угол растра, радианы */
  angle: number;
  shape: 'dot' | 'line';
  /** mono — шкала из двух цветов темы; cmyk — четыре растра (на светлом фоне) или RGB (на тёмном) */
  channels: 'mono' | 'cmyk';
  /** Бумага: фон темы */
  paper: Rgb;
  /** Краска монохромного растра */
  ink: Rgb;
}

export interface Sampler {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Цвет сетки в точке (x, y) её координат, билинейно; за краем — ближайший край */
export function sampleBilinear(sampler: Sampler, x: number, y: number, out: number[]): void {
  const { data, width, height } = sampler;
  const fx = Math.min(Math.max(x - 0.5, 0), width - 1);
  const fy = Math.min(Math.max(y - 0.5, 0), height - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const tx = fx - x0;
  const ty = fy - y0;

  for (let c = 0; c < 3; c++) {
    const a = data[(y0 * width + x0) * 4 + c]!;
    const b = data[(y0 * width + x1) * 4 + c]!;
    const d = data[(y1 * width + x0) * 4 + c]!;
    const e = data[(y1 * width + x1) * 4 + c]!;

    out[c] = (a + (b - a) * tx) * (1 - ty) + (d + (e - d) * tx) * ty;
  }
}

/**
 * Покрытие пикселя точкой растра 0…1 со сглаженным краем шириной в пиксель. `ink` — доля краски 0…1:
 * радиус точки √ink·0.71 — при полной краске точка касается углов ячейки и растр сливается в заливку.
 */
export function screenCoverage(
  u: number,
  v: number,
  ink: number,
  shape: 'dot' | 'line',
  pixelInCells: number,
): number {
  const fu = u - Math.floor(u) - 0.5;
  const fv = v - Math.floor(v) - 0.5;
  const distance = shape === 'dot' ? Math.hypot(fu, fv) : Math.abs(fv);
  const radius = shape === 'dot' ? Math.sqrt(Math.max(ink, 0)) * 0.7072 : Math.max(ink, 0) * 0.5;
  const edge = pixelInCells * 0.5;

  // Без краски — без точки: иначе сглаженный край дал бы полупрозрачную точку в каждой ячейке тени
  if (radius <= 0) return 0;

  return Math.min(1, Math.max(0, (radius - distance + edge) / (2 * edge)));
}

/** Углы растров CMYK как в типографии: голубой 15°, пурпурный 75°, жёлтый 0°, чёрный 45° — без муара */
const CMYK_ANGLES = [15, 75, 0, 45].map((deg) => (deg * Math.PI) / 180);

/**
 * Растр размером outWidth×outHeight. `grid` — исходник, уменьшенный до шага растра (ячейка сетки =
 * period пикселей результата): центры ячеек берут цвет из неё.
 */
export function halftonePixels(
  grid: Sampler,
  outWidth: number,
  outHeight: number,
  options: HalftoneOptions,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  const { period, paper, ink, shape } = options;
  const toGrid = grid.width / outWidth;
  const pixel = 1 / period;
  const color = [0, 0, 0];
  // На тёмной бумаге вычитание красок дало бы чёрное пятно — там растры складываются светом (RGB)
  const additive = luminance(...paper) < 0.5;
  const screens =
    options.channels === 'mono'
      ? [options.angle]
      : CMYK_ANGLES.slice(0, additive ? 3 : 4).map((angle) => angle + options.angle);
  const rotations = screens.map((angle) => [Math.cos(angle), Math.sin(angle)] as const);

  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      const i = (y * outWidth + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;
      let r = paper[0];
      let g = paper[1];
      let b = paper[2];

      for (let s = 0; s < rotations.length; s++) {
        const [cos, sin] = rotations[s]!;
        // Координаты в ячейках повёрнутого растра и центр своей ячейки — обратно в пиксели рамки
        const u = (px * cos + py * sin) * pixel;
        const v = (-px * sin + py * cos) * pixel;
        const cu = Math.floor(u) + 0.5;
        const cv = Math.floor(v) + 0.5;
        const cx = (cu * cos - cv * sin) * period;
        const cy = (cu * sin + cv * cos) * period;

        sampleBilinear(grid, cx * toGrid, cy * toGrid, color);

        const [cr, cg, cb] = color as [number, number, number];

        if (options.channels === 'mono') {
          const coverage = screenCoverage(u, v, luminance(cr, cg, cb), shape, pixel);

          r += (ink[0] - r) * coverage;
          g += (ink[1] - g) * coverage;
          b += (ink[2] - b) * coverage;
          continue;
        }

        if (additive) {
          const channel = [cr, cg, cb][s]! / 255;
          const coverage = screenCoverage(u, v, channel, shape, pixel) * 255;

          if (s === 0) r = Math.min(255, r + coverage);
          else if (s === 1) g = Math.min(255, g + coverage);
          else b = Math.min(255, b + coverage);

          continue;
        }

        // CMYK с выделением чёрного: K — общая темнота, остальное — доля цветной краски поверх неё
        const k = 1 - Math.max(cr, cg, cb) / 255;
        const share = (value: number) => (k >= 1 ? 0 : (1 - value / 255 - k) / (1 - k));
        const amount = s === 3 ? k : share(s === 0 ? cr : s === 1 ? cg : cb);
        const coverage = screenCoverage(u, v, amount, shape, pixel);

        // Голубая краска поглощает красный, пурпурная — зелёный, жёлтая — синий, чёрная — всё
        if (s === 0 || s === 3) r *= 1 - coverage;
        if (s === 1 || s === 3) g *= 1 - coverage;
        if (s === 2 || s === 3) b *= 1 - coverage;
      }

      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }

  return out;
}
