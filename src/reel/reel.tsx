import type { CSSProperties } from 'react';

import { Box, type BoxProps } from '../box/box';
import { cx } from '../lib/cx';
import { spaceVar, type Space } from '../lib/space';

import styles from './reel.module.css';

export interface ReelProps extends BoxProps {
  /** Ширина элемента: `240px`, `80%`; без неё — по содержимому */
  itemWidth?: string;
  gap?: Space;
  /** Прокрутка останавливается на начале элемента; по умолчанию да */
  snap?: boolean;
  /**
   * Подпись ленты для чтения с экрана. С ней лента — область с фокусом и листается стрелками с
   * клавиатуры; без неё листать можно только мышью и пальцем
   */
  label?: string;
}

/** Горизонтальная лента с прокруткой: карусель пространств, вложения, плитки — в одну строку */
export function Reel({
  itemWidth,
  gap = 3,
  snap = true,
  label,
  className,
  style,
  ...rest
}: ReelProps) {
  return (
    <Box
      className={cx(styles.reel, className)}
      data-snap={snap || undefined}
      role={label ? 'region' : undefined}
      aria-label={label}
      tabIndex={label ? 0 : undefined}
      style={{ '--item-width': itemWidth, gap: spaceVar(gap), ...style } as CSSProperties}
      {...rest}
    />
  );
}
