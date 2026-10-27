import type { ComponentPropsWithRef } from 'react';

import { boxStyle, type BoxOwnProps } from './box-style';

export type BoxProps = BoxOwnProps & ComponentPropsWithRef<'div'>;

/** Базовый контейнер: отступы и скругление из токенов, остальное — через className */
export function Box({ as, p, px, py, pt, pr, pb, pl, radius, style, ...rest }: BoxProps) {
  const Component = as ?? 'div';

  return (
    <Component style={{ ...boxStyle({ p, px, py, pt, pr, pb, pl, radius }), ...style }} {...rest} />
  );
}
