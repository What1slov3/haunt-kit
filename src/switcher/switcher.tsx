import type { CSSProperties } from 'react';

import { Box, type BoxProps } from '../box/box';
import { cx } from '../lib/cx';
import { spaceVar, type Space } from '../lib/space';

import styles from './switcher.module.css';

export interface SwitcherProps extends BoxProps {
  /** Уже этого контейнера все дети встают столбцом; шире — рядом поровну. Длина: `30rem`, `480px` */
  threshold?: string;
  gap?: Space;
}

/**
 * Ряд, который становится столбцом: все дети рядом поровну, пока контейнер шире `threshold`, иначе —
 * все друг под другом, без промежуточной «лесенки» 2 + 1. Решает ширина контейнера, не окна
 */
export function Switcher({
  threshold = '30rem',
  gap = 3,
  className,
  style,
  ...rest
}: SwitcherProps) {
  return (
    <Box
      className={cx(styles.root, className)}
      style={{ '--threshold': threshold, gap: spaceVar(gap), ...style } as CSSProperties}
      {...rest}
    />
  );
}
