import { Box, type BoxProps } from '../box/box';
import { cx } from '../lib/cx';

import styles from './center.module.css';

export interface CenterProps extends BoxProps {
  /** Строчный — по ширине содержимого, внутри текста или ряда */
  inline?: boolean;
  /** Занять высоту родителя: пустое состояние или загрузка посреди панели */
  fill?: boolean;
}

/** Содержимое по центру по обеим осям */
export function Center({ inline, fill, className, ...rest }: CenterProps) {
  return (
    <Box
      className={cx(styles.center, className)}
      data-inline={inline || undefined}
      data-fill={fill || undefined}
      {...rest}
    />
  );
}
