/*
 * Геометрия бегущего пунктира — чистые функции. Пунктир подгоняется под периметр рамки так, чтобы на
 * нём укладывалось целое число штрихов: иначе в месте, где контур замыкается, штрих и промежуток
 * сходятся неровно и шов «моргает» на каждом обороте.
 */

/** Периметр прямоугольника со скруглением r (радиус не больше половины стороны) */
export function roundedRectPerimeter(width: number, height: number, radius: number): number {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));

  return 2 * (width + height) - 8 * r + 2 * Math.PI * r;
}

export interface AntsDash {
  dash: number;
  gap: number;
  /** Штрих + промежуток: на столько сдвигается пунктир за один цикл анимации */
  period: number;
}

/** Штрих и промежуток, растянутые или сжатые до целого числа на периметре; пропорция сохраняется */
export function antsDash(perimeter: number, dash: number, gap: number): AntsDash {
  const base = Math.max(dash + gap, 0.001);

  if (perimeter <= 0) return { dash, gap, period: base };

  const count = Math.max(1, Math.round(perimeter / base));
  const period = perimeter / count;
  const scale = period / base;

  return { dash: dash * scale, gap: gap * scale, period };
}
