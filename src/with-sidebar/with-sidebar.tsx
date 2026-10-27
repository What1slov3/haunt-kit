import type { CSSProperties } from 'react';

import { Box, type BoxProps } from '../box/box';
import { cx } from '../lib/cx';
import { spaceVar, type Space } from '../lib/space';

import styles from './with-sidebar.module.css';

export interface WithSidebarProps extends BoxProps {
  /** Какой из двух детей — боковой: первый (start) или второй (end) */
  side?: 'start' | 'end';
  /** Ширина боковой части, пока обе стоят рядом; по умолчанию `--aside-width` (300 px) */
  sideWidth?: string;
  /** Уже этого основная часть не сжимается: боковая уходит под неё. Доля или длина: `50%`, `28rem` */
  contentMin?: string;
  gap?: Space;
  /** Высота частей: stretch — одной высоты (по умолчанию), start — каждая по своему содержимому */
  align?: 'stretch' | 'start';
}

/**
 * Две части рядом — основная и боковая; боковая уходит под основную, когда основной становится тесно.
 * Без точек перелома по ширине окна: решает ширина самого контейнера — в AppShell её меняют панели, и
 * окно об этом ничего не знает. Ровно два ребёнка.
 */
export function WithSidebar({
  side = 'end',
  sideWidth,
  contentMin = '50%',
  gap = 4,
  align = 'stretch',
  className,
  style,
  ...rest
}: WithSidebarProps) {
  return (
    <Box
      className={cx(styles.root, className)}
      data-side={side}
      data-align={align}
      style={
        {
          '--side-width': sideWidth,
          '--content-min': contentMin,
          gap: spaceVar(gap),
          ...style,
        } as CSSProperties
      }
      {...rest}
    />
  );
}
