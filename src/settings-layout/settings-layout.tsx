import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Button } from '../button/button';
import { Heading } from '../heading/heading';
import { cx } from '../lib/cx';
import { Spacer } from '../spacer/spacer';
import { Sticky } from '../sticky/sticky';
import { useUiStrings } from '../strings/ui-strings-context';
import { Text } from '../text/text';
import { WithSidebar } from '../with-sidebar/with-sidebar';

import styles from './settings-layout.module.css';

export interface SettingsLayoutProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** Разделы настроек — список `NavItem` */
  nav: ReactNode;
  navLabel?: string;
  /** Заголовок открытого раздела */
  title?: ReactNode;
  description?: ReactNode;
  /** Форма раздела */
  children: ReactNode;
  /** Есть несохранённые изменения: внизу прилипает полоса «Сбросить · Сохранить» */
  unsaved?: boolean;
  onSave?: () => void;
  onReset?: () => void;
  /** Сохранение идёт: кнопка «Сохранить» — со спиннером */
  saving?: boolean;
}

/**
 * Настройки: разделы слева (уходят над формой, когда ей тесно), справа — заголовок раздела и форма
 * шириной для чтения. Полоса несохранённых изменений прилипает к низу, пока `unsaved`: изменения видно,
 * где бы ни была прокрутка, и уйти с ними незаметно нельзя. Что сохранять и что сбросить — решает экран.
 */
export function SettingsLayout({
  nav,
  navLabel,
  title,
  description,
  children,
  unsaved,
  onSave,
  onReset,
  saving,
  className,
  ...rest
}: SettingsLayoutProps) {
  const strings = useUiStrings().settingsLayout;

  return (
    <div className={cx(styles.root, className)} {...rest}>
      <WithSidebar side="start" sideWidth="220px" contentMin="60%" align="start" gap={6}>
        <nav className={styles.nav} aria-label={navLabel ?? strings.nav}>
          {nav}
        </nav>

        <main className={styles.main}>
          {(title || description) && (
            <div className={styles.head}>
              {title && (
                <Heading level={1} size="xl">
                  {title}
                </Heading>
              )}

              {description && (
                <Text size="sm" tone="muted">
                  {description}
                </Text>
              )}
            </div>
          )}

          {children}

          {unsaved && (
            <Sticky
              edge="bottom"
              offset={4}
              elevate={false}
              className={styles.saveBar}
              role="status"
            >
              <Text size="sm" weight="medium">
                {strings.unsaved}
              </Text>

              <Spacer />

              <Button size="sm" variant="ghost" onClick={onReset} disabled={saving}>
                {strings.reset}
              </Button>

              <Button size="sm" variant="accent" onClick={onSave} loading={saving}>
                {strings.save}
              </Button>
            </Sticky>
          )}
        </main>
      </WithSidebar>
    </div>
  );
}
