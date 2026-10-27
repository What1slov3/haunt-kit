import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../lib/cx';

import styles from './steps.module.css';

export type StepsRootProps = ComponentPropsWithRef<'ol'>;

/** Нумерованный список шагов: номера считает CSS-счётчик, порядок — порядок детей */
export function StepsRoot({ className, ...rest }: StepsRootProps) {
  return <ol className={cx(styles.root, className)} {...rest} />;
}

export interface StepsItemProps extends Omit<ComponentPropsWithRef<'li'>, 'title'> {
  title: ReactNode;
  /** Пройденный шаг: номер сменяется галочкой цвета акцента */
  done?: boolean;
  /** Текущий шаг: номер в кольце акцента */
  current?: boolean;
}

export function StepsItem({ title, done, current, className, children, ...rest }: StepsItemProps) {
  return (
    <li
      className={cx(styles.item, className)}
      data-done={done || undefined}
      data-current={current || undefined}
      aria-current={current ? 'step' : undefined}
      {...rest}
    >
      <span className={styles.title}>{title}</span>

      {children && <div className={styles.body}>{children}</div>}
    </li>
  );
}

StepsRoot.displayName = 'Steps.Root';
StepsItem.displayName = 'Steps.Item';
