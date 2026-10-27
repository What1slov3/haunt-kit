export interface FormatIndexOptions {
  /** Всего разделов: `01 / 07` */
  total?: number;
  /** Префикс серии: `SEC-04`, `A-07` */
  prefix?: string;
  /** Цифр в номере, с ведущими нулями */
  pad?: number;
}

/**
 * Номер раздела как на чертеже: `01`, `01 / 07`, `SEC-04`, `A-07 / 12`. Строка выводится как есть —
 * готовый индекс (`B2`, `07Δ`) не переделывается.
 */
export function formatIndex(
  index: number | string,
  { total, prefix, pad = 2 }: FormatIndexOptions = {},
): string {
  const number = typeof index === 'number' ? String(Math.trunc(index)).padStart(pad, '0') : index;
  const head = prefix ? `${prefix}-${number}` : number;

  return total === undefined ? head : `${head} / ${String(Math.trunc(total)).padStart(pad, '0')}`;
}
