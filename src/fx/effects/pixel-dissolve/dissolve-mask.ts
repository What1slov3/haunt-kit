import { bayerMatrix } from '../../../filtered-image/image-filters';

/*
 * Раскладка маски PixelDissolve — чистые функции. Растворение по Байеру равномерно, поэтому маска
 * периодична: одна плитка order × order клеток, повторённая по элементу (mask-repeat). На уровне k
 * открыты клетки с порогом Байера меньше k: уровней order², каждый следующий — надмножество прошлого,
 * поэтому элемент «прорастает» точками и так же рассыпается обратно.
 */

export type DissolveOrder = 2 | 4 | 8;

/** Какие клетки плитки открыты на уровне `level` (0 — ни одной, order² — все), построчно */
export function dissolveCells(level: number, order: DissolveOrder): boolean[] {
  return bayerMatrix(order).map((threshold) => threshold < level);
}

/** Уровень маски по прогрессу 0…1 */
export function dissolveLevel(progress: number, order: DissolveOrder): number {
  return Math.round(Math.min(1, Math.max(0, progress)) * order * order);
}

/**
 * Плитка маски — SVG data URI: открытые клетки закрашены (маска по альфе), остальное прозрачно.
 * SVG, а не canvas: строка считается без DOM, кэшируется браузером, а `crispEdges` держит края клеток
 * резкими при любом devicePixelRatio.
 */
export function dissolveTile(level: number, order: DissolveOrder, cell: number): string {
  const size = order * cell;
  let path = '';

  dissolveCells(level, order).forEach((open, index) => {
    if (!open) return;

    const x = (index % order) * cell;
    const y = Math.floor(index / order) * cell;

    path += `M${x} ${y}h${cell}v${cell}h-${cell}z`;
  });

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" shape-rendering="crispEdges">` +
    (path ? `<path d="${path}" fill="black"/>` : '') +
    '</svg>';

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
