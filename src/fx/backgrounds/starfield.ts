/*
 * Звёздное поле — ядро фона `starfield`. Звезда — точка в объёме: x, y в −1…1, глубина z в (0, 1].
 * Проекция делит на z: близкие звёзды дальше от центра, крупнее и быстрее смещаются за курсором —
 * это и есть параллакс. «Прыжок» — короткий разгон к камере: звёзды тянутся в штрихи от центра.
 */

/** x, y, z, яркость */
export const STRIDE = 4;

const NEAR = 0.04;

/** Раскладка по seed: равномерно в объёме, яркость с длинным хвостом — мало ярких, много тусклых */
export function layoutStars(count: number, rand: () => number): Float32Array {
  const stars = new Float32Array(count * STRIDE);

  for (let i = 0; i < count; i++) {
    stars[i * STRIDE] = rand() * 2 - 1;
    stars[i * STRIDE + 1] = rand() * 2 - 1;
    stars[i * STRIDE + 2] = NEAR + rand() * (1 - NEAR);
    stars[i * STRIDE + 3] = 0.25 + 0.75 * rand() ** 3;
  }

  return stars;
}

/**
 * Движение к камере на `speed · dt` единиц глубины. Звезда, прошедшая ближнюю плоскость, уходит в
 * глубину с новыми x, y — поле не пустеет.
 */
export function advanceStars(
  stars: Float32Array,
  speed: number,
  dt: number,
  rand: () => number,
): void {
  for (let o = 0; o < stars.length; o += STRIDE) {
    let z = stars[o + 2]! - speed * dt;

    if (z < NEAR) {
      z += 1 - NEAR;
      stars[o] = rand() * 2 - 1;
      stars[o + 1] = rand() * 2 - 1;
    }

    stars[o + 2] = z;
  }
}

export interface Projection {
  x: number;
  y: number;
  /** Радиус точки, px */
  size: number;
  alpha: number;
}

/**
 * Проекция звезды на экран width × height. `px`, `py` — смещение взгляда за курсором (−1…1), сдвиг
 * точки пропорционален 1/z: ближние уходят сильнее дальних. `focal` — доля полуширины на единицу x/z.
 */
export function projectStar(
  stars: Float32Array,
  index: number,
  width: number,
  height: number,
  px: number,
  py: number,
  out: Projection,
  focal = 0.55,
): Projection {
  const o = index * STRIDE;
  const z = stars[o + 2]!;
  const half = Math.max(width, height) / 2;
  const depth = 1 - z;

  out.x = width / 2 + ((stars[o]! * focal) / z) * half - px * 14 * (1 / z);
  out.y = height / 2 + ((stars[o + 1]! * focal) / z) * half - py * 14 * (1 / z);
  out.size = 0.6 + 1.6 * depth * depth;
  // Дальние тусклее, у самой дальней плоскости проявляются плавно, а не возникают
  out.alpha = stars[o + 3]! * Math.min(1, (1 - z) * 4) * (0.5 + 0.5 * depth);

  return out;
}

/** Скорость прыжка: быстрый разгон, плавное торможение за `duration` секунд; 0 — прыжка нет */
export function jumpSpeed(elapsed: number, duration = 1.4): number {
  if (elapsed < 0 || elapsed > duration) return 0;

  const t = elapsed / duration;
  const rise = 1 - (1 - Math.min(1, t / 0.2)) ** 2;

  return rise * (1 - t) ** 2;
}
