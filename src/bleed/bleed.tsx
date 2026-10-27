import { Box, type BoxProps } from '../box/box';
import { spaceVar, type Space } from '../lib/space';

export interface BleedProps extends BoxProps {
  /** На сколько выйти за поле родителя по бокам — обычно ровно на его поле */
  x?: Space;
  /** Вверх и вниз */
  y?: Space;
  top?: Space;
  bottom?: Space;
  start?: Space;
  end?: Space;
}

const outward = (value: Space | undefined) =>
  value === undefined ? undefined : `calc(-1 * ${spaceVar(value)})`;

/**
 * Выйти за поле родителя: обложка во всю ширину карточки, картинка в посте до краёв колонки. Отрицательное
 * поле — ровно на шаг шкалы; текст внутри вернуть на место — обычным `px` у самого Bleed
 */
export function Bleed({ x, y, top, bottom, start, end, style, ...rest }: BleedProps) {
  return (
    <Box
      style={{
        marginTop: outward(top ?? y),
        marginBottom: outward(bottom ?? y),
        marginInlineStart: outward(start ?? x),
        marginInlineEnd: outward(end ?? x),
        ...style,
      }}
      {...rest}
    />
  );
}
