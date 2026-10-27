/*
 * Ширины колонок TuiTable в знаках моно-шрифта — чистыми функциями. Ширина строки — не length: эмодзи и
 * иероглифы занимают две клетки терминала, комбинирующие знаки — ноль, суррогатная пара — один знак.
 */

export type TuiAlign = 'left' | 'right' | 'center';

export interface TuiColumnSpec {
  /** Ширина колонки в знаках — ровно столько, сколько бы ни было в ячейках */
  width?: number;
  /** Не уже этого (знаки); по умолчанию — ширина заголовка, но не меньше 3 */
  minWidth?: number;
  /** Не шире этого: длиннее — обрезается многоточием */
  maxWidth?: number;
}

// Диапазоны, которые терминалы рисуют в две клетки: CJK, хангыль, полноширинные формы, эмодзи
const WIDE: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1f64f],
  [0x1f900, 0x1f9ff],
  [0x20000, 0x3fffd],
];

// Комбинирующие знаки, невидимые разделители и селекторы вариантов — ноль клеток
const ZERO_WIDTH: ReadonlyArray<readonly [number, number]> = [
  [0x0300, 0x036f],
  [0x200b, 0x200f],
  [0x20d0, 0x20ff],
  [0xfe00, 0xfe0f],
];

/** Сколько клеток терминала занимает знак */
export function charWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;

  const within = ([from, to]: readonly [number, number]) => code >= from && code <= to;

  if (ZERO_WIDTH.some(within)) return 0;

  return WIDE.some(within) ? 2 : 1;
}

export function textWidth(text: string): number {
  let width = 0;

  for (const char of text) width += charWidth(char);

  return width;
}

/** Текст не шире `width` клеток: не влез — обрезан, последняя клетка — «…» */
export function truncateText(text: string, width: number): string {
  if (width <= 0) return '';
  if (textWidth(text) <= width) return text;

  let result = '';
  let used = 0;

  for (const char of text) {
    const next = charWidth(char);

    if (used + next > width - 1) break;

    result += char;
    used += next;
  }

  return `${result}…`;
}

/**
 * Ширина каждой колонки: самая широкая ячейка или заголовок, в границах `minWidth` / `maxWidth`; `width`
 * задаёт ровно. `maxTotal` — предел всей таблицы в знаках вместе с рамкой: не влезли — сужаются самые
 * широкие колонки, пока не влезут или не упрутся в свой минимум.
 */
export function columnWidths(
  columns: readonly TuiColumnSpec[],
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  maxTotal?: number,
): number[] {
  const mins = columns.map((column, index) =>
    Math.max(1, column.width ?? column.minWidth ?? Math.min(3, textWidth(headers[index] ?? ''))),
  );
  const widths = columns.map((column, index) => {
    if (column.width !== undefined) return Math.max(1, column.width);

    const content = Math.max(
      textWidth(headers[index] ?? ''),
      ...rows.map((row) => textWidth(row[index] ?? '')),
    );

    return Math.max(mins[index] ?? 1, Math.min(content, column.maxWidth ?? Infinity));
  });

  if (maxTotal === undefined) return widths;

  // Рамка: «│ » перед каждой колонкой, « │» в конце — по три знака на колонку и один
  let overflow = tableWidth(widths) - maxTotal;

  while (overflow > 0) {
    let widest = -1;

    widths.forEach((width, index) => {
      const shrinkable = width > (mins[index] ?? 1) && columns[index]?.width === undefined;

      if (shrinkable && (widest === -1 || width > (widths[widest] ?? 0))) widest = index;
    });

    if (widest === -1) break;

    widths[widest] = (widths[widest] ?? 1) - 1;
    overflow -= 1;
  }

  return widths;
}

/** Ширина таблицы в знаках с рамкой: │ a │ b │ */
export function tableWidth(widths: readonly number[]): number {
  return widths.reduce((total, width) => total + width + 3, 1);
}
