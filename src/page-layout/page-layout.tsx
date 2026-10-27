import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Container, type ContainerSize } from '../container/container';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { WithSidebar } from '../with-sidebar/with-sidebar';

import styles from './page-layout.module.css';

export interface PageLayoutProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** Шапка над колонками — `SpaceHeader`, `ArtifactHeader`, заголовок раздела; той же ширины, что страница */
  header?: ReactNode;
  /** Боковая колонка: «о пространстве», оглавление, фильтры. Уходит под основную, когда той тесно */
  aside?: ReactNode;
  asideSide?: 'start' | 'end';
  /** Ширина боковой колонки; по умолчанию `--aside-width` (300 px) */
  asideWidth?: string;
  /** Боковая прилипает при прокрутке, пока стоит рядом с основной. По умолчанию да */
  stickyAside?: boolean;
  /** Подпись боковой колонки для чтения с экрана */
  asideLabel?: string;
  /** narrow — форма, reading — текст, wide — лента с колонкой (по умолчанию), full — во всю ширину */
  width?: ContainerSize;
  children: ReactNode;
}

/**
 * Страница внутри содержимого AppShell: колонка по центру (`Container`), шапка над ней и боковая колонка
 * (`WithSidebar`). Лента и форум — `wide` с `aside`, документ — `reading` с оглавлением в `aside`, обзор —
 * `wide` без него. Отзывается на ширину своего места, а не окна: в AppShell её меняют панели. Чат и
 * настройки устроены иначе — `ChatLayout`, `SettingsLayout`.
 */
export function PageLayout({
  header,
  aside,
  asideSide = 'end',
  asideWidth,
  stickyAside = true,
  asideLabel,
  width = 'wide',
  className,
  children,
  ...rest
}: PageLayoutProps) {
  const strings = useUiStrings().pageLayout;
  const main = <main className={styles.main}>{children}</main>;
  const side = aside && (
    <aside
      className={styles.aside}
      data-sticky={stickyAside || undefined}
      aria-label={asideLabel ?? strings.aside}
    >
      {aside}
    </aside>
  );

  return (
    <div className={cx(styles.page, className)} {...rest}>
      <Container size={width} className={styles.body}>
        {header}

        {aside ? (
          <WithSidebar
            side={asideSide}
            sideWidth={asideWidth}
            contentMin="55%"
            align="start"
            gap={5}
          >
            {asideSide === 'start' && side}

            {main}

            {asideSide === 'end' && side}
          </WithSidebar>
        ) : (
          main
        )}
      </Container>
    </div>
  );
}
