import type { ComponentPropsWithRef, CSSProperties } from 'react';

import { HoverCard as RadixHoverCard } from 'radix-ui';

import { cx } from '../lib/cx';
import { usePortalContainer } from '../theme/portal-container';

import styles from './hover-card.module.css';

export type HoverCardContentProps = ComponentPropsWithRef<typeof RadixHoverCard.Content> & {
  /**
   * Без поля и с обрезкой по скруглению — как `flush` у Popover: содержимое со своими полями и обложкой
   * (карточка профиля, превью с картинкой) ложится в стекло вплотную
   */
  flush?: boolean;
  /** Ширина карточки; по умолчанию 280 px. Не шире окна в любом случае */
  width?: CSSProperties['width'];
};

export function HoverCardContent({
  sideOffset = 6,
  collisionPadding = 8,
  flush,
  width,
  className,
  style,
  ...rest
}: HoverCardContentProps) {
  const container = usePortalContainer();

  return (
    <RadixHoverCard.Portal container={container}>
      <RadixHoverCard.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cx(styles.content, flush && styles.flush, className)}
        style={width === undefined ? style : { width, ...style }}
        {...rest}
      />
    </RadixHoverCard.Portal>
  );
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
HoverCardContent.displayName = 'HoverCard.Content';
