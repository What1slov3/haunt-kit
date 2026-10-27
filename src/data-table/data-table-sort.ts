export type SortValue = string | number | boolean | Date | null | undefined;
export type SortDirection = 'asc' | 'desc';

export interface DataTableSort {
  key: string;
  direction: SortDirection;
}

function isEmpty(value: SortValue): value is null | undefined {
  return (
    value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))
  );
}

function comparable(value: Exclude<SortValue, null | undefined>): number | string {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'boolean') return Number(value);

  return value;
}

/** Числа и даты — по величине, строки — Intl.Collator (числа внутри строк по значению: «канал 2» < «канал 10») */
export function compareValues(
  a: Exclude<SortValue, null | undefined>,
  b: Exclude<SortValue, null | undefined>,
  collator: Intl.Collator,
): number {
  const left = comparable(a);
  const right = comparable(b);

  if (typeof left === 'number' && typeof right === 'number') return left - right;

  return collator.compare(String(left), String(right));
}

/**
 * Стабильная сортировка: равные строки сохраняют исходный порядок (вторичный ключ — индекс), а пустые
 * значения (null, undefined, NaN) всегда в конце — и по возрастанию, и по убыванию: «нет данных» не
 * должно всплывать наверх при смене направления. Исходный массив не меняется.
 */
export function sortRows<T>(
  rows: readonly T[],
  getValue: (row: T) => SortValue,
  direction: SortDirection,
  locale = 'ru',
): T[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  const sign = direction === 'asc' ? 1 : -1;

  return rows
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((a, b) => {
      const left = a.value;
      const right = b.value;

      if (isEmpty(left) || isEmpty(right)) {
        if (isEmpty(left) === isEmpty(right)) return a.index - b.index;

        return isEmpty(left) ? 1 : -1;
      }

      return sign * compareValues(left, right, collator) || a.index - b.index;
    })
    .map((entry) => entry.row);
}

/** Клик по заголовку: нет → по возрастанию → по убыванию → нет; другая колонка начинает с возрастания */
export function nextSort(current: DataTableSort | null, key: string): DataTableSort | null {
  if (!current || current.key !== key) return { key, direction: 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };

  return null;
}
