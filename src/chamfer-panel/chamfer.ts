/*
 * Геометрия среза углов. Форма — clip-path polygon с calc() от размеров среза, поэтому панель тянется
 * под содержимое без JS и ResizeObserver. Рамка — отдельное кольцо: тот же многоугольник снаружи и
 * вдавленный на толщину рамки внутри, вырезанные правилом evenodd. Это вырез, а не обводка по подложке
 * (решение 8 в docs/ui-kit.md): прозрачная заливка панели не показывает под собой цвет рамки.
 */

export type ChamferCorner = 'tl' | 'tr' | 'br' | 'bl';

export const CHAMFER_CORNERS: readonly ChamferCorner[] = ['tl', 'tr', 'br', 'bl'];

/** Размер среза каждого угла — CSS-длина (`var(--chamfer)`, `0px`) */
export type ChamferCuts = Record<ChamferCorner, string>;

/*
 * Срез под 45°, сдвинутый внутрь на толщину рамки b, в координатах внутреннего прямоугольника короче на
 * (2 − √2) · b: диагональ x + y = c сдвигается на b·√2, а начало координат — на b по обеим осям.
 */
const INNER_CUT_FACTOR = 2 - Math.SQRT2;

export function cutsFor(corners: readonly ChamferCorner[], size: string): ChamferCuts {
  const cuts = { tl: '0px', tr: '0px', br: '0px', bl: '0px' };

  for (const corner of corners) cuts[corner] = size;

  return cuts;
}

/** Восемь вершин по часовой от верхней кромки; inset — отступ внутрь (для кольца рамки) */
function points(cuts: ChamferCuts, inset?: string): string[] {
  const cut = (corner: ChamferCorner) =>
    inset ? `max(0px, ${cuts[corner]} - ${INNER_CUT_FACTOR.toFixed(4)} * ${inset})` : cuts[corner];
  const near = (length: string) => (inset ? `calc(${inset} + ${length})` : length);
  const far = (length: string) =>
    inset ? `calc(100% - ${inset} - ${length})` : `calc(100% - ${length})`;
  const edge = inset ? `calc(100% - ${inset})` : '100%';
  const start = inset ?? '0px';
  const { tl, tr, br, bl } = { tl: cut('tl'), tr: cut('tr'), br: cut('br'), bl: cut('bl') };

  return [
    `${near(tl)} ${start}`,
    `${far(tr)} ${start}`,
    `${edge} ${near(tr)}`,
    `${edge} ${far(br)}`,
    `${far(br)} ${edge}`,
    `${near(bl)} ${edge}`,
    `${start} ${far(bl)}`,
    `${start} ${near(tl)}`,
  ];
}

/** Форма панели */
export function chamferPolygon(cuts: ChamferCuts): string {
  return `polygon(${points(cuts).join(', ')})`;
}

/**
 * Кольцо рамки: внешний контур, возврат в первую вершину, внутренний контур и возврат в его первую
 * вершину. Перемычка между контурами проходится туда и обратно — нулевая площадь, щели нет.
 */
export function chamferRing(cuts: ChamferCuts, width: string): string {
  const outer = points(cuts);
  const inner = points(cuts, width);

  return `polygon(evenodd, ${[...outer, outer[0] ?? '', ...inner, inner[0] ?? ''].join(', ')})`;
}
