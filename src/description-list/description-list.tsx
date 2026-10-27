import type { ComponentPropsWithRef, CSSProperties, Key, ReactNode } from 'react';

import { CopyButton } from '../copy-button/copy-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './description-list.module.css';

export interface DescriptionItem {
  /** Ключ React; по умолчанию — подпись, если она строка, иначе позиция */
  id?: Key;
  label: ReactNode;
  value: ReactNode;
  /** Текст для копирования; без него копируется `value`, если это строка или число */
  copyValue?: string;
  /** Моно у этого значения — id, хеш, токен */
  mono?: boolean;
}

export interface DescriptionListProps extends Omit<ComponentPropsWithRef<'dl'>, 'children'> {
  items: readonly DescriptionItem[];
  /** horizontal — ключ слева, значение справа; vertical — ключ над значением, сеткой колонок */
  orientation?: 'horizontal' | 'vertical';
  /** Колонок у vertical; по умолчанию — сколько влезет по 160 px */
  columns?: number;
  /** Моно у всех значений */
  mono?: boolean;
  /** Кнопка копирования у значений, которые можно скопировать */
  copyable?: boolean;
  /** Плотность строк: compact — 24 px, default — 28 px */
  density?: 'compact' | 'default';
}

function copyTextOf(item: DescriptionItem): string | null {
  if (item.copyValue !== undefined) return item.copyValue;
  if (typeof item.value === 'string' || typeof item.value === 'number') return String(item.value);

  return null;
}

/**
 * Ключ — значение, плотно: свойства канала, сведения о боте, метаданные файла. `<dl>` с парами в `<div>`
 * (так разрешает HTML): скринридер читает «термин — определение», а сетка держит ровные колонки.
 */
export function DescriptionList({
  items,
  orientation = 'horizontal',
  columns,
  mono = false,
  copyable = false,
  density = 'default',
  className,
  style,
  ...rest
}: DescriptionListProps) {
  const strings = useUiStrings();

  return (
    <dl
      className={cx(styles.root, styles[orientation], styles[density], className)}
      style={{ ...(columns ? { '--columns': columns } : null), ...style } as CSSProperties}
      data-columns={columns ? true : undefined}
      {...rest}
    >
      {items.map((item, index) => {
        const text = copyable ? copyTextOf(item) : null;
        const key = item.id ?? (typeof item.label === 'string' ? item.label : index);

        return (
          <div key={key} className={styles.item}>
            <dt className={styles.label}>{item.label}</dt>

            <dd className={cx(styles.value, (item.mono ?? mono) && styles.mono)}>
              <span className={styles.text}>{item.value}</span>

              {text !== null && (
                <CopyButton
                  size="xs"
                  value={text}
                  label={
                    typeof item.label === 'string'
                      ? strings.descriptionList.copy(item.label)
                      : undefined
                  }
                  className={styles.copy}
                />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
