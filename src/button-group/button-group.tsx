import type { ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';

import styles from './button-group.module.css';

export interface ButtonGroupProps extends ComponentPropsWithRef<'div'> {
  /** Подпись группы для скринридера: «Форматирование», «Отправка» */
  label?: string;
  /** Склеенные (по умолчанию): общая рамка, скругление только по краям. false — ряд с промежутком */
  attached?: boolean;
}

/**
 * Группа кнопок: `Button` и `IconButton` одного размера. Склеенная — для связанных действий и кнопки с
 * меню (`Отправить` + `▾`): соседние рамки сливаются, у залитых между кнопками тонкий разделитель.
 */
export function ButtonGroup({ label, attached = true, className, ...rest }: ButtonGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(styles.group, attached ? styles.attached : styles.spaced, className)}
      {...rest}
    />
  );
}
