import type { ComponentPropsWithRef } from 'react';

import { ArrowUpRight } from 'lucide-react';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';

import styles from './link.module.css';

export interface LinkProps extends ComponentPropsWithRef<'a'> {
  /** accent — цвет акцента (ссылка в тексте), muted — цвет текста с подчёркиванием при наведении */
  tone?: 'accent' | 'muted' | 'inherit';
  /** Внешняя: target=_blank, rel и стрелка */
  external?: boolean;
}

/** Текстовая ссылка. Роутера пока нет — это обычный <a>; при появлении роутера оборачивать через asChild */
export function Link({ tone = 'accent', external, className, children, ...rest }: LinkProps) {
  return (
    <a
      className={cx(styles.link, styles[tone], className)}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      {...rest}
    >
      {children}

      {external && <Icon icon={ArrowUpRight} size="xs" className={styles.external} />}
    </a>
  );
}
