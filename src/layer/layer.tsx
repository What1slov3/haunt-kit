import { Box, type BoxProps } from '../box/box';
import { cx } from '../lib/cx';
import { spaceVar, type Space } from '../lib/space';

import styles from './layer.module.css';

/** Где встать слою: угол, край, центр или вся площадь */
export type LayerPlace =
  | 'top-start'
  | 'top'
  | 'top-end'
  | 'start'
  | 'center'
  | 'end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'
  | 'fill';

/**
 * Слои друг над другом: все дети в одной ячейке сетки, размер — по самому большому, порядок наложения —
 * порядок в разметке. Значок на аватаре, подпись на обложке, кнопка в углу превью — без position: absolute
 * и подбора отступов. Расположение слоя — `LayerItem place`
 */
export function Layer({ className, ...rest }: BoxProps) {
  return <Box className={cx(styles.layer, className)} {...rest} />;
}

export interface LayerItemProps extends BoxProps {
  /** По умолчанию fill — слой на всю площадь */
  place?: LayerPlace;
  /** Отступ от края, к которому слой прижат */
  offset?: Space;
}

export function LayerItem({ place = 'fill', offset, className, style, ...rest }: LayerItemProps) {
  return (
    <Box
      className={cx(styles.item, className)}
      data-place={place}
      style={{ margin: spaceVar(offset), ...style }}
      {...rest}
    />
  );
}
