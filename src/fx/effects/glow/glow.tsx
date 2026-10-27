import { useRef, type ComponentPropsWithRef, type CSSProperties } from 'react';

import { cx } from '../../../lib/cx';
import { radiusVar, type Radius } from '../../../lib/space';
import { useFxEnvironment } from '../../use-fx-environment';

import styles from './glow.module.css';

export interface GlowProps extends ComponentPropsWithRef<'span'> {
  /** Цвет: токен (`--accent`), цвет роли или любой CSS-цвет */
  color?: string;
  /** Скругление ребёнка: свечение повторяет его форму и скругляется концентрично на вынос */
  radius?: Radius;
  /** Вынос свечения за край, px */
  spread?: number;
  /** Размытие, px */
  blur?: number;
  /** Сила 0…1; умножается на `--fx-glow` */
  strength?: number;
  /** Медленно дышит (опасная зона, «в эфире») */
  pulse?: boolean;
  /** Свечение видно; false — как без обёртки */
  active?: boolean;
}

/**
 * Мягкое свечение цвета роли или акцента вокруг ребёнка — аватар, карточка. Слой за ребёнком повторяет
 * его форму (радиус + вынос, решение 9), размыт `filter: blur`, дыхание — только opacity и transform.
 * Сила — `--fx-glow`: при `data-effects="off"` свечения нет, как у кнопки `accent`; reduced-motion —
 * свечение стоит.
 */
export function Glow({
  color = '--accent',
  radius = 'full',
  spread = 4,
  blur = 12,
  strength = 0.7,
  pulse = false,
  active = true,
  className,
  style,
  children,
  ...rest
}: GlowProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const { motion } = useFxEnvironment(rootRef);

  return (
    <span
      ref={rootRef}
      className={cx(styles.root, className)}
      data-active={active ? '' : undefined}
      data-pulse={pulse && motion ? '' : undefined}
      style={
        {
          '--glow-color': color.startsWith('--') ? `var(${color})` : color,
          '--glow-radius': radiusVar(radius),
          '--glow-spread': `${spread}px`,
          '--glow-blur': `${blur}px`,
          '--glow-strength': strength,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      {children}
    </span>
  );
}
