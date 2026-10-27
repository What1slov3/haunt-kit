import { useState, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from 'react';

import { DropdownMenu } from '../dropdown-menu/dropdown-menu';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import { collapseBreadcrumbs } from './breadcrumbs-collapse';
import styles from './breadcrumbs.module.css';

export interface BreadcrumbItem {
  /** Строкой: длинная подпись обрезается, полная — в title и в меню свёрнутых */
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface BreadcrumbsProps extends Omit<ComponentPropsWithRef<'nav'>, 'children'> {
  /** Путь от корня; последний — текущая страница (`aria-current`), он не ссылка */
  items: readonly BreadcrumbItem[];
  /** Сколько элементов видно, считая многоточие; длиннее — середина сворачивается в меню */
  maxItems?: number;
  /** Сколько крошек от корня не сворачивать */
  itemsBefore?: number;
  /**
   * Переход внутри приложения: обычный клик по ссылке гасится и уходит сюда; Ctrl/⌘/Shift-клик и
   * средняя кнопка остаются браузеру — открыть в новой вкладке. Без него ссылки работают как `<a href>`
   */
  onNavigate?: (item: BreadcrumbItem, index: number) => void;
  /** Подпись навигации для скринридера */
  label?: string;
}

function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}

/** Путь в настройках и вложенных местах: `nav` + `ol`, разделитель `/` моно, середина сворачивается */
export function Breadcrumbs({
  items,
  maxItems = 4,
  itemsBefore = 1,
  onNavigate,
  label,
  className,
  ...rest
}: BreadcrumbsProps) {
  const strings = useUiStrings();
  const [menuOpen, setMenuOpen] = useState(false);
  const path = collapseBreadcrumbs(items.length, maxItems, itemsBefore);
  const lastIndex = items.length - 1;

  const crumb = (index: number) => {
    const item = items[index]!;
    const content = (
      <>
        {item.icon && <span className={styles.icon}>{item.icon}</span>}
        <span className={styles.text}>{item.label}</span>
      </>
    );

    if (index === lastIndex) {
      return (
        <span className={cx(styles.crumb, styles.current)} aria-current="page" title={item.label}>
          {content}
        </span>
      );
    }

    if (item.href) {
      return (
        <a
          href={item.href}
          className={cx(styles.crumb, styles.link)}
          title={item.label}
          onClick={(event) => {
            if (!onNavigate || !isPlainClick(event)) return;

            event.preventDefault();
            onNavigate(item, index);
          }}
        >
          {content}
        </a>
      );
    }

    if (onNavigate) {
      return (
        <button
          type="button"
          className={cx(styles.crumb, styles.link)}
          title={item.label}
          onClick={() => onNavigate(item, index)}
        >
          {content}
        </button>
      );
    }

    return (
      <span className={styles.crumb} title={item.label}>
        {content}
      </span>
    );
  };

  const separator = (key: string) => <li key={key} className={styles.separator} aria-hidden />;

  const entries: ReactNode[] = [];

  for (const index of path.before) {
    if (entries.length) entries.push(separator(`sep-${index}`));

    entries.push(
      <li key={index} className={styles.item}>
        {crumb(index)}
      </li>,
    );
  }

  if (path.hidden.length) {
    if (entries.length) entries.push(separator('sep-hidden'));

    entries.push(
      <li key="hidden" className={styles.item}>
        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger
            className={cx(styles.crumb, styles.link, styles.more)}
            aria-label={strings.breadcrumbs.hidden(path.hidden.length)}
          >
            …
          </DropdownMenu.Trigger>

          <DropdownMenu.Content align="start">
            {path.hidden.map((index) => {
              const item = items[index]!;

              if (!item.href) {
                return (
                  <DropdownMenu.Item
                    key={index}
                    icon={item.icon}
                    onSelect={() => onNavigate?.(item, index)}
                  >
                    {item.label}
                  </DropdownMenu.Item>
                );
              }

              // Пункт со ссылкой — настоящая `<a href>`: Ctrl/⌘-клик и средняя кнопка открывают вкладку
              // браузером, Enter Radix превращает в клик по ней же
              return (
                <DropdownMenu.Item key={index} icon={item.icon} asChild>
                  <a
                    href={item.href}
                    className={styles.menuLink}
                    onClick={(event) => {
                      if (!onNavigate || !isPlainClick(event)) return;

                      // Погашенный клик Radix не считает выбором — меню закрываем сами
                      event.preventDefault();
                      setMenuOpen(false);
                      onNavigate(item, index);
                    }}
                  >
                    {item.label}
                  </a>
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </li>,
    );
  }

  for (const index of path.after) {
    if (entries.length) entries.push(separator(`sep-${index}`));

    entries.push(
      <li key={index} className={styles.item}>
        {crumb(index)}
      </li>,
    );
  }

  return (
    <nav
      aria-label={label ?? strings.breadcrumbs.label}
      className={cx(styles.root, className)}
      {...rest}
    >
      <ol className={styles.list}>{entries}</ol>
    </nav>
  );
}
