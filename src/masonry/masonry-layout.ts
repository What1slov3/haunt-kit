/*
 * Раскладка плиток разной высоты по колонкам — чистая функция: каждая следующая плитка встаёт в самую
 * короткую колонку (при равенстве — в левую). Так верх раскладки идёт слева направо в порядке разметки,
 * и порядок чтения с экрана совпадает с тем, что видно глазами, — в отличие от CSS columns, где порядок
 * идёт сверху вниз по колонкам.
 */

export interface MasonryPosition {
  x: number;
  y: number;
}

export interface MasonryResult {
  positions: MasonryPosition[];
  /** Высота самой длинной колонки — высота контейнера */
  height: number;
}

/** Сколько колонок шириной не меньше `minColumnWidth` влезает в `width` с промежутком `gap` */
export function masonryColumns(width: number, minColumnWidth: number, gap: number): number {
  return Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)));
}

export function masonryLayout(
  heights: readonly number[],
  columns: number,
  columnWidth: number,
  gap: number,
): MasonryResult {
  const tops = new Array<number>(Math.max(1, columns)).fill(0);
  const positions = heights.map((height) => {
    let column = 0;

    for (let i = 1; i < tops.length; i++) if (tops[i]! < tops[column]!) column = i;

    const position = { x: column * (columnWidth + gap), y: tops[column]! };

    tops[column]! += height + gap;

    return position;
  });
  const longest = Math.max(...tops);

  return { positions, height: heights.length ? longest - gap : 0 };
}
