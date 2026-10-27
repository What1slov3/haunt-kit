import type { ComponentProps } from 'react';

import type { LucideIcon } from 'lucide-react';

import { cx } from '../lib/cx';

import styles from './icon.module.css';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps extends Omit<ComponentProps<'svg'>, 'ref'> {
  /** Компонент из lucide-react: `<Icon icon={Search} />` */
  icon: LucideIcon;
  /** 12 / 14 / 16 / 20 / 24 px; md — для кнопок 28 px и пунктов списков */
  size?: IconSize;
  /** Декоративная иконка скрыта от скринридера; с подписью — читается */
  label?: string;
}

const sizePx: Record<IconSize, number> = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 };

/** Одна толщина штриха на всю систему: тонкая, но читаемая на 16 px */
const STROKE_WIDTH = 1.75;

export function Icon({ icon: LucideComponent, size = 'md', label, className, ...rest }: IconProps) {
  return (
    <LucideComponent
      size={sizePx[size]}
      strokeWidth={STROKE_WIDTH}
      absoluteStrokeWidth
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={cx(styles.icon, className)}
      {...rest}
    />
  );
}
