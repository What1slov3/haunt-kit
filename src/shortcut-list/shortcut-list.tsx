import { Fragment, useId, type ComponentPropsWithRef } from 'react';

import { Kbd } from '../kbd/kbd';
import { currentPlatform, isApplePlatform, hotkeyParts } from '../lib/hotkey';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './shortcut-list.module.css';

export interface ShortcutEntry {
  /** Что делает: «Открыть палитру команд» */
  label: string;
  /** Сочетание в записи `useHotkey` (`'mod+k'`); массив — равноправные варианты («Ctrl K или /») */
  keys: string | readonly string[];
}

export interface ShortcutGroup {
  heading: string;
  items: readonly ShortcutEntry[];
}

export interface ShortcutListProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  groups: readonly ShortcutGroup[];
  /** Группы в одну или две колонки (две — в диалоге справки на широком экране) */
  columns?: 1 | 2;
  /** Подписи для Apple (⌘, ⌥) или остальных (Ctrl, Alt); по умолчанию — по текущей платформе */
  apple?: boolean;
}

/**
 * Справка по клавишам (`?`): группы, строки «действие — клавиши». Сочетания — те же строки, что слушает
 * `useHotkey`, поэтому справка не расходится с поведением и сама показывает ⌘ на macOS.
 */
export function ShortcutList({
  groups,
  columns = 1,
  apple = isApplePlatform(currentPlatform()),
  className,
  ...rest
}: ShortcutListProps) {
  const strings = useUiStrings();
  const baseId = useId();

  return (
    <div className={cx(styles.root, columns === 2 && styles.twoColumns, className)} {...rest}>
      {groups.map((group, groupIndex) => {
        const headingId = `${baseId}-${groupIndex}`;

        return (
          <section key={group.heading} className={styles.group} aria-labelledby={headingId}>
            <h3 id={headingId} className={styles.heading}>
              {group.heading}
            </h3>

            <dl className={styles.list}>
              {group.items.map((item) => (
                <div key={item.label} className={styles.row}>
                  <dt className={styles.label}>{item.label}</dt>

                  <dd className={styles.keys}>
                    {(typeof item.keys === 'string' ? [item.keys] : item.keys).map(
                      (combo, index) => (
                        <Fragment key={combo}>
                          {index > 0 && (
                            <span className={styles.or}>{strings.shortcutList.or}</span>
                          )}
                          <Combo combo={combo} apple={apple} />
                        </Fragment>
                      ),
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

/** На Apple значки идут подряд (⇧⌘K), как в меню macOS; на остальных — через плюс */
function Combo({ combo, apple }: { combo: string; apple: boolean }) {
  const parts = hotkeyParts(combo, apple);

  return (
    <span className={styles.combo}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && !apple && (
            <span className={styles.plus} aria-hidden>
              +
            </span>
          )}
          <Kbd size="sm">{part}</Kbd>
        </Fragment>
      ))}
    </span>
  );
}
