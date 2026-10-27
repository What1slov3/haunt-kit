import type { CSSProperties, ElementType } from 'react';

import { radiusVar, spaceVar, type Radius, type Space } from '../lib/space';

export interface BoxOwnProps {
  /** Какой тег рендерить; для полиморфизма без усложнения типов пропсы остаются как у div */
  as?: ElementType;
  /** Отступ со всех сторон по шкале `--space-*`: `p={2}` → 8 px, `p={1.5}` → 6 px */
  p?: Space;
  /** Отступ слева и справа; сильнее `p` */
  px?: Space;
  /** Отступ сверху и снизу; сильнее `p` */
  py?: Space;
  /** Отступ сверху; сильнее `py` и `p` */
  pt?: Space;
  /** Отступ справа; сильнее `px` и `p` */
  pr?: Space;
  /** Отступ снизу; сильнее `py` и `p` */
  pb?: Space;
  /** Отступ слева; сильнее `px` и `p` */
  pl?: Space;
  /** Скругление по шкале `--radius-*`; `none` — без скругления */
  radius?: Radius;
}

export function boxStyle({ p, px, py, pt, pr, pb, pl, radius }: BoxOwnProps): CSSProperties {
  return {
    paddingTop: spaceVar(pt ?? py ?? p),
    paddingRight: spaceVar(pr ?? px ?? p),
    paddingBottom: spaceVar(pb ?? py ?? p),
    paddingLeft: spaceVar(pl ?? px ?? p),
    borderRadius: radiusVar(radius),
  };
}
