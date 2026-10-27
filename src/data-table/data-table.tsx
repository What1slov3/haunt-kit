import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type Key,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { useVirtualWindow } from '../virtual-list/use-virtual-window';

import { nextSort, sortRows, type DataTableSort, type SortValue } from './data-table-sort';
import styles from './data-table.module.css';

export interface DataTableColumn<T> {
  /** Ключ колонки; без `value` — ещё и имя поля строки, из которого берётся значение */
  key: string;
  header: ReactNode;
  /** Содержимое ячейки; по умолчанию — значение как текст */
  cell?: (row: T, index: number) => ReactNode;
  /** Значение для сортировки (и ячейки по умолчанию); по умолчанию — `row[key]` */
  value?: (row: T) => SortValue;
  sortable?: boolean;
  /** По умолчанию start, у числовых — end */
  align?: 'start' | 'center' | 'end';
  /** Ширина колонки: число — px, строка — любая CSS-длина */
  width?: number | string;
  /** Числовая колонка: моно, табличные цифры, выравнивание по правому краю */
  numeric?: boolean;
}

export interface DataTableProps<T> extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  columns: DataTableColumn<T>[];
  rows: readonly T[];
  /** Устойчивый ключ строки — id, а не индекс: иначе подсветка «переезжает» при сортировке */
  rowKey: (row: T, index: number) => Key;
  /** Высота строки: compact 28 / default 32 px */
  density?: 'compact' | 'default';
  /** Управляемая сортировка; `null` — без сортировки */
  sort?: DataTableSort | null;
  /** Начальная сортировка неуправляемой таблицы */
  defaultSort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  /** Строка становится кликабельной и фокусируемой (Enter / Space) */
  onRowClick?: (row: T, index: number) => void;
  /** Ключ выбранной строки — подсвечена тоном акцента */
  selectedKey?: Key | null;
  /** Что показать без строк; по умолчанию «Нет данных» */
  empty?: ReactNode;
  /** Шапка прилипает при прокрутке; высоту прокрутки задаёт `maxHeight` */
  stickyHeader?: boolean;
  /** Максимальная высота области прокрутки */
  maxHeight?: number | string;
  /**
   * Виртуализация строк — для тысяч строк: в DOM только окно. Нужна `maxHeight` (или высота от
   * родителя). Колонки фиксируются (`table-layout: fixed`): ширины из `width`, остаток поровну — при
   * прокрутке они не прыгают от содержимого новых строк. Липкая шапка остаётся
   */
  virtual?: boolean;
  /** Подпись таблицы для скринридера */
  label?: string;
  /** Локаль сравнения строк при сортировке; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
}

const ariaSort = { asc: 'ascending', desc: 'descending' } as const;

/** Оценка высоты строки до измерения: высота плотности + рамка 1 px снизу */
const rowEstimate = { compact: 29, default: 33 } as const;

function readValue<T>(column: DataTableColumn<T>, row: T): SortValue {
  if (column.value) return column.value(row);

  return (row as Record<string, unknown>)[column.key] as SortValue;
}

function defaultCell(value: SortValue): ReactNode {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toLocaleString();

  return String(value);
}

/**
 * Таблица данных для админки: журнал аудита, роли, участники. Колонки — описанием, сортировка по клику
 * в заголовке (стабильная, пустые значения в конце), липкая шапка, две плотности, подсветка строки.
 * Сотни строк — как есть, тысячи — с `virtual`: в DOM только окно строк.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  density = 'default',
  sort,
  defaultSort = null,
  onSortChange,
  onRowClick,
  selectedKey,
  empty,
  stickyHeader = true,
  maxHeight,
  virtual = false,
  label,
  locale: localeProp,
  className,
  style,
  ref,
  ...rest
}: DataTableProps<T>) {
  const strings = useUiStrings();
  const locale = useUiLocale(localeProp);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [innerSort, setInnerSort] = useState<DataTableSort | null>(defaultSort);
  const currentSort = sort === undefined ? innerSort : sort;
  const sortColumn = currentSort && columns.find((column) => column.key === currentSort.key);

  const ordered =
    currentSort && sortColumn
      ? sortRows(rows, (row) => readValue(sortColumn, row), currentSort.direction, locale)
      : rows;

  const windowed = useVirtualWindow({
    count: ordered.length,
    getKey: (index) => rowKey(ordered[index] as T, index),
    estimateSize: () => rowEstimate[density],
    scrollRef: rootRef,
    enabled: virtual,
    overscan: 8,
  });

  // Новая сортировка — к началу: иначе окно держалось бы за строку, которая уехала в другое место
  const sortSignature = currentSort ? `${currentSort.key}:${currentSort.direction}` : '';

  // Прямо scrollTop, а не scrollToIndex(0): тот поставил бы первую строку под липкую шапку
  useLayoutEffect(() => {
    if (virtual && rootRef.current) rootRef.current.scrollTop = 0;
  }, [virtual, sortSignature]);

  // Своя ссылка на область прокрутки для окна и ref снаружи — на один и тот же элемент
  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;

      if (typeof ref === 'function') {
        const cleanup = ref(node);

        return () => {
          rootRef.current = null;

          if (typeof cleanup === 'function') cleanup();
          else ref(null);
        };
      }

      if (ref) ref.current = node;

      return () => {
        rootRef.current = null;

        if (ref) ref.current = null;
      };
    },
    [ref],
  );

  const rowIndexes = virtual
    ? windowed.items.map((item) => item.index)
    : ordered.map((_, index) => index);

  const toggleSort = (key: string) => {
    const next = nextSort(currentSort, key);

    if (sort === undefined) setInnerSort(next);

    onSortChange?.(next);
  };

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T, index: number) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    // Пробел иначе прокрутил бы область таблицы
    event.preventDefault();
    onRowClick?.(row, index);
  };

  return (
    <div
      ref={setRoot}
      className={cx(
        styles.root,
        styles[density],
        stickyHeader && styles.sticky,
        virtual && styles.virtual,
        className,
      )}
      style={{ maxHeight, ...style }}
      {...rest}
    >
      <table
        className={styles.table}
        aria-label={label}
        // В DOM лишь окно строк: число и номера строк скринридер берёт из aria, а не из DOM
        aria-rowcount={virtual ? ordered.length + 1 : undefined}
      >
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}
        </colgroup>

        <thead>
          <tr aria-rowindex={virtual ? 1 : undefined}>
            {columns.map((column) => {
              const active = currentSort?.key === column.key ? currentSort.direction : undefined;
              const align = column.align ?? (column.numeric ? 'end' : 'start');

              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cx(styles.head, styles[`align-${align}`])}
                  aria-sort={column.sortable ? (active ? ariaSort[active] : 'none') : undefined}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className={styles.sortButton}
                      data-active={active ? '' : undefined}
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.header}

                      <Icon
                        icon={
                          active === 'asc'
                            ? ChevronUp
                            : active === 'desc'
                              ? ChevronDown
                              : ChevronsUpDown
                        }
                        size="xs"
                        className={styles.sortIcon}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {ordered.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {empty ?? strings.dataTable.empty}
              </td>
            </tr>
          ) : (
            <>
              {virtual && windowed.before > 0 && (
                <tr aria-hidden className={styles.spacer}>
                  <td colSpan={columns.length} style={{ height: windowed.before }} />
                </tr>
              )}

              {rowIndexes.map((index) => {
                const row = ordered[index] as T;
                const key = rowKey(row, index);

                return (
                  <tr
                    key={key}
                    ref={virtual ? windowed.measureElement : undefined}
                    data-virtual-index={virtual ? index : undefined}
                    aria-rowindex={virtual ? index + 2 : undefined}
                    className={styles.row}
                    data-selected={
                      selectedKey !== undefined && selectedKey === key ? '' : undefined
                    }
                    data-clickable={onRowClick ? '' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                    onKeyDown={onRowClick ? (event) => onRowKeyDown(event, row, index) : undefined}
                  >
                    {columns.map((column) => {
                      const align = column.align ?? (column.numeric ? 'end' : 'start');

                      return (
                        <td
                          key={column.key}
                          className={cx(
                            styles.cell,
                            styles[`align-${align}`],
                            column.numeric && styles.numeric,
                          )}
                        >
                          {column.cell
                            ? column.cell(row, index)
                            : defaultCell(readValue(column, row))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {virtual && windowed.after > 0 && (
                <tr aria-hidden className={styles.spacer}>
                  <td colSpan={columns.length} style={{ height: windowed.after }} />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

export type { DataTableSort, SortDirection, SortValue } from './data-table-sort';
