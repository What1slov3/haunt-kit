/*
 * «Экранные» ядра на полном разрешении: CRT (развёртка, маска люминофора, бочка, свечение) и
 * хроматическая аберрация (сдвиг каналов). Тот же расчёт, что у шейдеров `crt` и `rgb-split`, — здесь
 * запасной путь на CPU. Формулы общие, поэтому вынесены функциями и проверяются отдельно.
 */

/**
 * Бочка: точка (u, v) рамки 0…1 → откуда брать цвет на исходнике. Чем дальше от центра, тем сильнее
 * точка «уезжает» наружу — края выпуклого кинескопа. k — сила (0.04…0.12 — «лёгкая» бочка).
 */
export function barrel(u: number, v: number, k: number): [number, number] {
  const x = u - 0.5;
  const y = v - 0.5;
  const scale = 1 + k * (x * x + y * y);

  return [x * scale + 0.5, y * scale + 0.5];
}

/** Яркость строки развёртки 0…1: косинус с периодом `pitch` пикселей, тёмный промежуток — глубина */
export function scanline(y: number, pitch: number, depth: number): number {
  return 1 - depth * (0.5 - 0.5 * Math.cos((2 * Math.PI * (y + 0.5)) / pitch));
}

/**
 * Маска люминофора — апертурная решётка: вертикальные полосы R, G, B шириной `stripe` пикселей. Свой
 * канал полосы светится полностью, чужие — на `floor`: так картинка темнеет меньше и не уходит в радугу.
 */
export function phosphorMask(x: number, stripe: number, floor: number, out: number[]): void {
  const channel = Math.floor(x / stripe) % 3;

  out[0] = channel === 0 ? 1 : floor;
  out[1] = channel === 1 ? 1 : floor;
  out[2] = channel === 2 ? 1 : floor;
}

export interface CrtOptions {
  /** Шаг развёртки, пиксели результата */
  pitch: number;
  /** Кривизна бочки */
  curvature: number;
  /** Цвет за краем кинескопа */
  background: readonly [number, number, number];
}

function sample(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
  c: number,
) {
  const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
  const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)));

  return data[(y * width + x) * 4 + c]!;
}

/**
 * CRT на CPU. `frame` — исходник в размер рамки, `glow` — он же, уменьшенный в 8 раз (сглаживание
 * при уменьшении — это и есть размытие свечения, бесплатно).
 */
export function crtPixels(
  frame: Uint8ClampedArray,
  glow: { data: Uint8ClampedArray; width: number; height: number },
  width: number,
  height: number,
  options: CrtOptions,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  const stripe = Math.max(1, options.pitch / 3);
  const mask = [1, 1, 1];

  for (let y = 0; y < height; y++) {
    const line = scanline(y, options.pitch, 0.55);

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [u, v] = barrel((x + 0.5) / width, (y + 0.5) / height, options.curvature);

      if (u < 0 || u > 1 || v < 0 || v > 1) {
        out[i] = options.background[0];
        out[i + 1] = options.background[1];
        out[i + 2] = options.background[2];
        out[i + 3] = 255;
        continue;
      }

      phosphorMask(x, stripe, 0.6, mask);

      // Виньетка: к углам кинескоп темнее
      const dx = u - 0.5;
      const dy = v - 0.5;
      const vignette = 1 - 0.9 * (dx * dx + dy * dy);

      for (let c = 0; c < 3; c++) {
        const base = sample(frame, width, height, u, v, c);
        const halo = sample(glow.data, glow.width, glow.height, u, v, c);
        // Маска и развёртка темнят — поднимаем на 1.35; свечение растёт с квадратом яркости, как у люминофора
        const value = base * line * mask[c]! * 1.35 + ((halo * halo) / 255) * 0.35;

        out[i + c] = value * vignette;
      }

      out[i + 3] = 255;
    }
  }

  return out;
}

/**
 * Хроматическая аберрация: красный сдвинут наружу от центра, синий — внутрь, зелёный на месте.
 * Сдвиг растёт к краям (как у линзы), но и в центре не ноль — иначе эффект не виден на главном.
 */
export function rgbSplit(
  frame: Uint8ClampedArray,
  width: number,
  height: number,
  offset: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  const half = Math.max(width, height) / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dx = (x - width / 2) / half;
      const dy = (y - height / 2) / half;
      const sx = (0.4 + 1.2 * Math.abs(dx)) * offset * Math.sign(dx || 1);
      const sy = 1.2 * dy * offset;
      const rx = Math.min(width - 1, Math.max(0, Math.round(x + sx)));
      const ry = Math.min(height - 1, Math.max(0, Math.round(y + sy)));
      const bx = Math.min(width - 1, Math.max(0, Math.round(x - sx)));
      const by = Math.min(height - 1, Math.max(0, Math.round(y - sy)));

      out[i] = frame[(ry * width + rx) * 4]!;
      out[i + 1] = frame[i + 1]!;
      out[i + 2] = frame[(by * width + bx) * 4 + 2]!;
      out[i + 3] = 255;
    }
  }

  return out;
}
