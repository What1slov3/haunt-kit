import type { ComponentPropsWithRef, ElementType } from 'react';

import { cx } from '../lib/cx';

import styles from './text.module.css';

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type TextWeight = 'thin' | 'normal' | 'medium' | 'semibold' | 'bold';
export type TextTone =
  'default' | 'muted' | 'subtle' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'inherit';

export interface TextProps extends ComponentPropsWithRef<'span'> {
  /** Какой тег рендерить: `p`, `div`, `time`… по умолчанию `span` */
  as?: ElementType;
  /** 11 / 12 / 13 / 14 / 16 px; интерфейс — md, сообщения — lg */
  size?: TextSize;
  weight?: TextWeight;
  /** Цвет по смыслу; inherit — цвет родителя */
  tone?: TextTone;
  /** Одна строка с многоточием; родитель должен ограничивать ширину (min-width: 0 у флекс-детей) */
  truncate?: boolean;
  /** Многострочный текст с переносом длинных слов и ссылок — для сообщений */
  wrap?: boolean;
  /** Выравнивание текста в блоке */
  align?: 'start' | 'center' | 'end';
  /** Моно — для времени, счётчиков, id, кода (TUI-акцент) */
  mono?: boolean;
}

export function Text({
  as,
  size = 'md',
  weight = 'normal',
  tone = 'default',
  truncate,
  wrap,
  align,
  mono,
  className,
  ...rest
}: TextProps) {
  const Component = as ?? 'span';

  return (
    <Component
      className={cx(
        styles.text,
        styles[`size-${size}`],
        styles[`weight-${weight}`],
        styles[`tone-${tone}`],
        truncate && styles.truncate,
        wrap && styles.wrap,
        align && styles[`align-${align}`],
        mono && styles.mono,
        className,
      )}
      {...rest}
    />
  );
}
