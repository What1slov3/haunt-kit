/*
 * Клеточный автомат — ядро фона `life`. «Жизнь» Конвея (B3/S23) на торе: края склеены, фигуры не
 * упираются в стену. Поле — Uint8Array 0/1, шаг пишет в отдельный буфер: правило читает соседей
 * прошлого поколения, на месте считать нельзя.
 */

export function seedLife(
  cols: number,
  rows: number,
  density: number,
  rand: () => number,
): Uint8Array {
  const cells = new Uint8Array(cols * rows);

  for (let i = 0; i < cells.length; i++) cells[i] = rand() < density ? 1 : 0;

  return cells;
}

/** Одно поколение: из `cells` в `next`; возвращает число живых */
export function stepLife(cells: Uint8Array, next: Uint8Array, cols: number, rows: number): number {
  let alive = 0;

  for (let y = 0; y < rows; y++) {
    const up = ((y - 1 + rows) % rows) * cols;
    const mid = y * cols;
    const down = ((y + 1) % rows) * cols;

    for (let x = 0; x < cols; x++) {
      const left = (x - 1 + cols) % cols;
      const right = (x + 1) % cols;
      const n =
        cells[up + left]! +
        cells[up + x]! +
        cells[up + right]! +
        cells[mid + left]! +
        cells[mid + right]! +
        cells[down + left]! +
        cells[down + x]! +
        cells[down + right]!;
      const live = n === 3 || (n === 2 && cells[mid + x] === 1) ? 1 : 0;

      next[mid + x] = live;
      alive += live;
    }
  }

  return alive;
}

/** Глайдер — фигура, которую пульс шины «бросает» в поле: уползает по диагонали */
export const GLIDER: readonly (readonly [number, number])[] = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
];

/** Поставить фигуру с левым верхним углом в (x, y), с переносом через края */
export function stamp(
  cells: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  pattern: readonly (readonly [number, number])[],
): void {
  for (const [dx, dy] of pattern) {
    const cx = (((x + dx) % cols) + cols) % cols;
    const cy = (((y + dy) % rows) + rows) % rows;

    cells[cy * cols + cx] = 1;
  }
}

/**
 * Застой: поле не меняется или повторяется с периодом 2 (мигалки), или почти вымерло — пора
 * подсеять. Сравниваем с поколением два шага назад, а не с прошлым: так ловятся и осцилляторы.
 */
export function isStagnant(
  cells: Uint8Array,
  twoAgo: Uint8Array,
  alive: number,
  minAlive: number,
): boolean {
  if (alive < minAlive) return true;

  for (let i = 0; i < cells.length; i++) if (cells[i] !== twoAgo[i]) return false;

  return true;
}
