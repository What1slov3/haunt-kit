/** Буква столбца как в таблицах и на картах: A…Z, затем AA, AB… */
export function columnLabel(index: number): string {
  let n = Math.trunc(index) + 1;
  let label = '';

  while (n > 0) {
    const rest = (n - 1) % 26;

    label = String.fromCharCode(65 + rest) + label;
    n = Math.floor((n - 1) / 26);
  }

  return label;
}

/** Номер строки с ведущим нулём: 01, 02… */
export function rowLabel(index: number): string {
  return String(Math.trunc(index) + 1).padStart(2, '0');
}

export interface GridLabels {
  columns: string[];
  rows: string[];
}

/** Подписи по краям для поля width × height с ячейкой cell: только целые ячейки, хвост без подписи */
export function gridLabels(width: number, height: number, cell: number): GridLabels {
  if (!(cell > 0)) return { columns: [], rows: [] };

  const count = (length: number) => Math.max(0, Math.floor(length / cell));

  return {
    columns: Array.from({ length: count(width) }, (_, i) => columnLabel(i)),
    rows: Array.from({ length: count(height) }, (_, i) => rowLabel(i)),
  };
}

/** Ячейка под точкой (x, y) от левого верхнего угла поля: `C-04`; за краем — null */
export function cellAt(x: number, y: number, cell: number): string | null {
  if (!(cell > 0) || x < 0 || y < 0) return null;

  return `${columnLabel(Math.floor(x / cell))}-${rowLabel(Math.floor(y / cell))}`;
}
