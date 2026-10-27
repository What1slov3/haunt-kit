import type { ComponentPropsWithRef, ReactNode } from 'react';

import { ArrowUpRight } from 'lucide-react';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';

import styles from './card.module.css';

export interface CardProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  title: ReactNode;
  /** Приглушённое пояснение под заголовком */
  description?: ReactNode;
  /** Иконка в квадратике над заголовком — как у карточек Fumadocs */
  icon?: ReactNode;
  /** Карточка-ссылка: рендерится как <a>, подсвечивается при наведении, несёт прожектор */
  href?: string;
  /** Внешняя ссылка: новая вкладка и стрелка ↗ у заголовка */
  external?: boolean;
}

/**
 * Карточка в духе Fumadocs: рамка, тихий фон, иконка в квадратике, заголовок и описание. Для
 * разделов настроек, «куда дальше», списков интеграций. Сетка карточек — CardGrid.
 */
export function Card({
  title,
  description,
  icon,
  href,
  external,
  className,
  children,
  ...rest
}: CardProps) {
  const body = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}

      <span className={styles.title}>
        {title}

        {external && <Icon icon={ArrowUpRight} size="sm" className={styles.external} />}
      </span>

      {description && <span className={styles.description}>{description}</span>}

      {children && <div className={styles.extra}>{children}</div>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        className={cx(styles.card, styles.interactive, className)}
        data-spotlight
        {...(rest as ComponentPropsWithRef<'a'>)}
      >
        {body}
      </a>
    );
  }

  return (
    <div className={cx(styles.card, className)} {...rest}>
      {body}
    </div>
  );
}

export interface CardGridProps extends ComponentPropsWithRef<'div'> {
  /** Минимальная ширина карточки; колонок столько, сколько влезет */
  minColumnWidth?: string;
}

/** Сетка карточек: авто-колонки от минимальной ширины, промежуток 12 px */
export function CardGrid({ minColumnWidth = '220px', className, style, ...rest }: CardGridProps) {
  return (
    <div
      className={cx(styles.grid, className)}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(min(${minColumnWidth}, 100%), 1fr))`,
        ...style,
      }}
      {...rest}
    />
  );
}
