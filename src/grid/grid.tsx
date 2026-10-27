import { Box, type BoxProps } from '../box/box';
import { cx } from '../lib/cx';
import { spaceVar, type Space } from '../lib/space';

import styles from './grid.module.css';

export interface GridProps extends BoxProps {
  /** Число равных колонок, строка `grid-template-columns` или минимальная ширина для авто-сетки */
  columns?: number | string;
  /** Авто-сетка: колонок столько, сколько влезет при этой минимальной ширине */
  minColumnWidth?: string;
  /** Промежуток между ячейками по шкале `--space-*` */
  gap?: Space;
  /** Промежуток между строками; сильнее `gap` */
  rowGap?: Space;
  /** Промежуток между колонками; сильнее `gap` */
  columnGap?: Space;
}

function templateColumns(columns: GridProps['columns'], minColumnWidth: string | undefined) {
  if (minColumnWidth) return `repeat(auto-fill, minmax(${minColumnWidth}, 1fr))`;
  if (typeof columns === 'number') return `repeat(${columns}, minmax(0, 1fr))`;

  return columns;
}

export function Grid({
  columns,
  minColumnWidth,
  gap = 3,
  rowGap,
  columnGap,
  className,
  style,
  ...rest
}: GridProps) {
  return (
    <Box
      className={cx(styles.grid, className)}
      style={{
        gridTemplateColumns: templateColumns(columns, minColumnWidth),
        // Только длинные свойства: React пишет `rowGap: undefined` пустой строкой, и она стирала
        // половину сокращённого `gap` — колонки сетки слипались
        rowGap: spaceVar(rowGap ?? gap),
        columnGap: spaceVar(columnGap ?? gap),
        ...style,
      }}
      {...rest}
    />
  );
}
