import type { ComponentPropsWithRef, ElementType } from 'react';

import { cx } from '../lib/cx';

import styles from './heading.module.css';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingSize = '4xl' | '3xl' | '2xl' | 'xl' | 'lg' | 'md' | 'sm';

export interface HeadingProps extends ComponentPropsWithRef<'h2'> {
  /** Семантический уровень — тег; визуальный размер задаётся отдельно */
  level?: HeadingLevel;
  /** Визуальный размер по шкале `--text-*`; по умолчанию выводится из level (h1 → 3xl … h6 → sm) */
  size?: HeadingSize;
  /** Свой тег вместо `h${level}`, например `div` у заголовка карточки */
  as?: ElementType;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  tone?: 'default' | 'muted' | 'subtle' | 'accent';
  /** Одна строка с многоточием */
  truncate?: boolean;
  /** Маркер-префикс в моно (`>`), TUI-акцент; гасится data-tui='off' */
  marker?: boolean;
  /** Капитель моно для заголовков секций в списках («Участники — 4») */
  overline?: boolean;
}

const defaultSize: Record<HeadingLevel, HeadingSize> = {
  1: '3xl',
  2: '2xl',
  3: 'xl',
  4: 'lg',
  5: 'md',
  6: 'sm',
};

export function Heading({
  level = 2,
  size,
  as,
  weight = 'semibold',
  tone = 'default',
  truncate,
  marker,
  overline,
  className,
  ...rest
}: HeadingProps) {
  const Component = as ?? (`h${level}` as ElementType);
  const resolvedSize = size ?? defaultSize[level];

  return (
    <Component
      className={cx(
        styles.heading,
        styles[`size-${resolvedSize}`],
        styles[`weight-${weight}`],
        styles[`tone-${tone}`],
        truncate && styles.truncate,
        marker && styles.marker,
        overline && styles.overline,
        className,
      )}
      {...rest}
    />
  );
}
