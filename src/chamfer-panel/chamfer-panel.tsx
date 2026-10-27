import type { ComponentPropsWithRef, CSSProperties, ElementType } from 'react';

import { cx } from '../lib/cx';

import { chamferPolygon, chamferRing, cutsFor, type ChamferCorner } from './chamfer';
import styles from './chamfer-panel.module.css';

export type ChamferSize = 'sm' | 'md' | 'lg';

export interface ChamferPanelProps extends ComponentPropsWithRef<'div'> {
  /** Какие углы срезаны: `tl`, `tr`, `br`, `bl` */
  corners?: readonly ChamferCorner[];
  /** Размер среза: `--chamfer-sm` / `--chamfer` / `--chamfer-lg` (в стиле «сигнал» 6 / 10 / 18 px) */
  size?: ChamferSize;
  /** `default` — поверхность и линия, `accent` — тон акцента, `solid` — заливка акцентом, `hatch` — штриховка */
  tone?: 'default' | 'accent' | 'solid' | 'hatch';
  /** Без внутреннего отступа — для содержимого во всю панель (картинка, таблица) */
  flush?: boolean;
  as?: ElementType;
}

const sizeVar: Record<ChamferSize, string> = {
  sm: 'var(--chamfer-sm, 6px)',
  md: 'var(--chamfer, 10px)',
  lg: 'var(--chamfer-lg, 16px)',
};

/**
 * Панель со срезанными углами. Срез и рамка — clip-path (рамка повторяет срез кольцом, а не обводкой),
 * поэтому панель на любом фоне, со стеклом и градиентом выглядит одинаково. Содержимое у срезанного угла
 * обрезается вместе с панелью — отступ по умолчанию больше среза `md`.
 */
export function ChamferPanel({
  corners = ['tl', 'br'],
  size = 'md',
  tone = 'default',
  flush,
  as: Component = 'div',
  className,
  style,
  children,
  ...rest
}: ChamferPanelProps) {
  const cuts = cutsFor(corners, sizeVar[size]);
  const shape = {
    '--chamfer-shape': chamferPolygon(cuts),
    '--chamfer-ring': chamferRing(cuts, 'var(--hairline, 1px)'),
    ...style,
  } as CSSProperties;

  return (
    <Component
      className={cx(styles.panel, styles[tone], flush && styles.flush, className)}
      style={shape}
      data-corners={corners.join(' ')}
      {...rest}
    >
      {children}
    </Component>
  );
}
