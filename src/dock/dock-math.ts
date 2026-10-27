/*
 * Увеличение дока у курсора — чистыми функциями. Масштаб падает от курсора косинусом до нуля на `range`;
 * чтобы увеличенные не налезали друг на друга, ряд раздвигается: каждый сдвигается на прибавку соседей
 * перед ним, а весь ряд — так, чтобы точка под курсором осталась на месте (как док macOS).
 */

export interface DockMagnification {
  /** Размер пункта в покое, px */
  size: number;
  /** Масштаб пункта прямо под курсором */
  max: number;
  /** Дальше этого от курсора (px) пункт не увеличивается */
  range: number;
}

export interface DockItemTransform {
  scale: number;
  /** Сдвиг вдоль оси дока, px */
  offset: number;
}

/** Масштаб пункта на расстоянии `distance` от курсора */
export function dockScale(distance: number, { max, range }: DockMagnification): number {
  const d = Math.abs(distance);

  if (range <= 0 || d >= range) return 1;

  return 1 + (max - 1) * ((Math.cos((Math.PI * d) / range) + 1) / 2);
}

/**
 * Масштаб и сдвиг каждого пункта. `centers` — центры пунктов в покое вдоль оси, `pointer` — координата
 * курсора; null — курсора нет, всё в покое.
 */
export function dockLayout(
  centers: readonly number[],
  pointer: number | null,
  options: DockMagnification,
): DockItemTransform[] {
  if (pointer === null || centers.length === 0) {
    return centers.map(() => ({ scale: 1, offset: 0 }));
  }

  const scales = centers.map((center) => dockScale(center - pointer, options));
  const extras = scales.map((scale) => (scale - 1) * options.size);
  const total = extras.reduce((sum, extra) => sum + extra, 0);
  const start = (centers[0] ?? 0) - options.size / 2;
  const end = (centers.at(-1) ?? 0) + options.size / 2;
  // Какая доля прибавки уходит влево: курсор у левого края — ряд растёт вправо, посередине — в обе стороны
  const share = end > start ? Math.min(Math.max((pointer - start) / (end - start), 0), 1) : 0.5;
  let before = 0;

  return scales.map((scale, index) => {
    const extra = extras[index] ?? 0;
    const offset = before + extra / 2 - total * share;

    before += extra;

    return { scale, offset };
  });
}

/**
 * Насколько ряд вылез за свои края в покое: подложка дока растёт на столько же с каждой стороны, чтобы
 * увеличенные плитки не торчали за неё
 */
export function dockGrowth(
  layout: readonly DockItemTransform[],
  size: number,
): { start: number; end: number } {
  const first = layout[0];
  const last = layout.at(-1);

  if (!first || !last) return { start: 0, end: 0 };

  return {
    start: Math.max(0, -first.offset + ((first.scale - 1) * size) / 2),
    end: Math.max(0, last.offset + ((last.scale - 1) * size) / 2),
  };
}
