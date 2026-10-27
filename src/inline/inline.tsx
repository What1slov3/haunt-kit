import { Box } from '../box/box';
import { cx } from '../lib/cx';
import { flexStyle } from '../stack/flex-style';
import type { StackProps } from '../stack/stack';

import styles from './inline.module.css';

export type InlineProps = StackProps;

/** Горизонтальный ряд: по умолчанию центрирует по вертикали, как строка с иконкой и текстом */
export function Inline({
  gap = 2,
  align = 'center',
  justify,
  wrap,
  grow,
  className,
  style,
  ...rest
}: InlineProps) {
  return (
    <Box
      className={cx(styles.inline, className)}
      style={{ ...flexStyle({ gap, align, justify, wrap, grow }), ...style }}
      {...rest}
    />
  );
}
