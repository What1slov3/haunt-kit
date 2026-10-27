import type { ComponentPropsWithRef, CSSProperties, Key } from 'react';

import { BOX_GLYPHS, type BoxFrameVariant } from '../box-frame/box-glyphs';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import {
  columnWidths,
  tableWidth,
  truncateText,
  type TuiAlign,
  type TuiColumnSpec,
} from './tui-table-layout';
import styles from './tui-table.module.css';

export interface TuiTableColumn<T> extends TuiColumnSpec {
  key: string;
  header: string;
  /** Числа — вправо, как в `ls -l` */
  align?: TuiAlign;
  /** Текст ячейки; по умолчанию — `row[key]` строкой */
  value?: (row: T, index: number) => string;
}

export interface TuiTableProps<T> extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  columns: readonly TuiTableColumn<T>[];
  rows: readonly T[];
  /** Устойчивый ключ строки; по умолчанию — индекс */
  getRowKey?: (row: T, index: number) => Key;
  /** Подпись таблицы для скринридера */
  label?: string;
  /** Набор знаков, как у BoxFrame */
  variant?: BoxFrameVariant;
  /** Предел ширины таблицы в знаках вместе с рамкой: широкие колонки сужаются, текст — с «…» */
  maxWidth?: number;
  /** Линия между строками, а не только под шапкой */
  rowSeparators?: boolean;
}

type RuleKind = 'top' | 'middle' | 'bottom';

/** Стыки линии-разделителя: начало, между колонками, конец — ┌┬┐, ├┼┤, └┴┘ */
const JOINTS = {
  top: ['tl', 'tDown', 'tr'],
  middle: ['tRight', 'cross', 'tLeft'],
  bottom: ['bl', 'tUp', 'br'],
} as const;

const cellText = <T,>(column: TuiTableColumn<T>, row: T, index: number) =>
  column.value
    ? column.value(row, index)
    : String((row as Record<string, unknown> | null)?.[column.key] ?? '');

/**
 * Таблица из псевдографики: `│ ─ ┼`, моно, колонки выровнены по ширине в знаках (`tui-table-layout.ts`: эмодзи
 * и иероглифы — две клетки). Линии — те же знаки, что у BoxFrame, разделитель — полная строка сетки, как
 * в терминале; ячейки — настоящая ARIA-таблица, линии от скринридера скрыты. При `data-tui="off"` — тонкие рамки кита, моно и выравнивание
 * остаются: это данные.
 */
export function TuiTable<T>({
  columns,
  rows,
  getRowKey,
  label,
  variant = 'single',
  maxWidth,
  rowSeparators = false,
  className,
  style,
  ...rest
}: TuiTableProps<T>) {
  const strings = useUiStrings().tuiTable;
  const headers = columns.map((column) => column.header);
  const cells = rows.map((row, index) => columns.map((column) => cellText(column, row, index)));
  const widths = columnWidths(columns, headers, cells, maxWidth);
  const glyphs = BOX_GLYPHS[variant];
  const bar = (
    <span className={styles.bar} aria-hidden>
      {glyphs.v}
    </span>
  );

  const rule = (kind: RuleKind, key: string) => {
    const [start, joint, end] = JOINTS[kind];

    return (
      <div key={key} className={styles.rule} data-kind={kind} aria-hidden>
        {glyphs[start] +
          widths.map((width) => glyphs.h.repeat(width + 2)).join(glyphs[joint]) +
          glyphs[end]}
      </div>
    );
  };

  const line = (values: readonly string[], header: boolean) =>
    columns.map((column, index) => (
      <span key={column.key} className={styles.cellWrap}>
        {bar}

        <span
          role={header ? 'columnheader' : 'cell'}
          className={styles.cell}
          data-align={column.align ?? 'left'}
          style={{ '--w': widths[index] } as CSSProperties}
          title={header ? undefined : values[index]}
        >
          {truncateText(values[index] ?? '', widths[index] ?? 1)}
        </span>
      </span>
    ));

  return (
    <div
      role="table"
      aria-label={label}
      aria-rowcount={rows.length + 1}
      className={cx(styles.root, className)}
      data-variant={variant}
      style={{ ...style, '--table-width': tableWidth(widths) } as CSSProperties}
      {...rest}
    >
      {rule('top', 'rule-top')}

      <div role="row" className={cx(styles.row, styles.head)}>
        {line(headers, true)}

        {bar}
      </div>

      {rule('middle', 'rule-head')}

      {rows.length === 0 && (
        <div role="row" className={styles.row}>
          {bar}

          <span role="cell" className={cx(styles.cell, styles.empty)}>
            {strings.empty}
          </span>

          {bar}
        </div>
      )}

      {rows.flatMap((row, index) => {
        const key = getRowKey ? getRowKey(row, index) : index;
        const items = [
          <div key={key} role="row" className={styles.row}>
            {line(cells[index] ?? [], false)}

            {bar}
          </div>,
        ];

        if (rowSeparators && index < rows.length - 1) items.push(rule('middle', `rule-${key}`));

        return items;
      })}

      {rule('bottom', 'rule-bottom')}
    </div>
  );
}
