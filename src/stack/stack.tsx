import { Box, type BoxProps } from '../box/box';
import { cx } from '../lib/cx';

import { flexStyle, type FlexProps } from './flex-style';
import styles from './stack.module.css';

export type StackProps = BoxProps & FlexProps;

/** Вертикальная колонка с промежутком из токенов */
export function Stack({
  gap = 3,
  align,
  justify,
  wrap,
  grow,
  className,
  style,
  ...rest
}: StackProps) {
  return (
    <Box
      className={cx(styles.stack, className)}
      style={{ ...flexStyle({ gap, align, justify, wrap, grow }), ...style }}
      {...rest}
    />
  );
}
