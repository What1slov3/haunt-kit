import { Box, type BoxProps } from '../box/box';
import { cx } from '../lib/cx';
import { spaceVar, type Space } from '../lib/space';

import styles from './container.module.css';

export type ContainerSize = 'narrow' | 'reading' | 'wide' | 'full';

export interface ContainerProps extends BoxProps {
  /** narrow — форма (560), reading — текст (720), wide — лента с колонкой (1120), full — без предела */
  size?: ContainerSize;
  /** Поле слева и справа по шкале `--space-*`: на узком месте содержимое не липнет к краю */
  gutter?: Space;
}

/** Колонка страницы по центру: предельная ширина из токенов `--container-*` и поля по бокам */
export function Container({
  size = 'wide',
  gutter = 4,
  className,
  style,
  ...rest
}: ContainerProps) {
  return (
    <Box
      className={cx(styles.container, className)}
      data-size={size}
      style={{ paddingInline: spaceVar(gutter), ...style }}
      {...rest}
    />
  );
}
