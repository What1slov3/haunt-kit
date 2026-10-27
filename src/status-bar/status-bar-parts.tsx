import type { ComponentPropsWithRef, MouseEventHandler, ReactNode } from 'react';

import { cx } from '../lib/cx';

import styles from './status-bar.module.css';

export interface StatusBarProps extends ComponentPropsWithRef<'div'> {
  /** Элементы прижаты вправо и не сжимаются; левые при нехватке места уходят под затухание */
  end?: ReactNode;
}

/**
 * Строка состояния в духе TUI: моно, тонкая верхняя граница, подсказки клавиш, `│` между пунктами.
 * Кладётся внизу панели или окна: <StatusBar end={<StatusBar.Item>…</…>}><StatusBar.Item>…</StatusBar>
 */
export function StatusBarRoot({ end, className, children, ...rest }: StatusBarProps) {
  return (
    <div role="status" className={cx(styles.bar, className)} {...rest}>
      <div className={cx(styles.group, styles.start)}>{children}</div>

      {end && <div className={cx(styles.group, styles.end)}>{end}</div>}
    </div>
  );
}

export interface StatusBarItemProps extends Omit<ComponentPropsWithRef<'span'>, 'onClick'> {
  /** Иконка или Kbd слева */
  icon?: ReactNode;
  /** Точка цвета тона перед текстом; у success — три мягких удара при появлении */
  dot?: boolean;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  /**
   * С обработчиком пункт становится кнопкой (переключить статус, открыть панель); `title` и
   * `aria-label` уходят на неё, остальные атрибуты span — нет
   */
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function StatusBarItem({
  icon,
  dot,
  tone = 'default',
  onClick,
  className,
  children,
  ...rest
}: StatusBarItemProps) {
  const content = (
    <>
      {dot && <span className={styles.dot} aria-hidden />}

      {icon && <span className={styles.icon}>{icon}</span>}

      {children}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        title={rest.title}
        aria-label={rest['aria-label']}
        className={cx(styles.item, styles.interactive, styles[tone], className)}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={cx(styles.item, styles[tone], className)} {...rest}>
      {content}
    </span>
  );
}

// Имена как в JSX — так их показывают «Show code» в Storybook и React DevTools
StatusBarRoot.displayName = 'StatusBar';
StatusBarItem.displayName = 'StatusBar.Item';
