import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { Label } from '../label/label';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import { FieldContext } from './field-context';
import styles from './field.module.css';

export interface FieldProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  label?: ReactNode;
  /** Подсказка под полем; при ошибке заменяется текстом ошибки */
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Пометка `[опц.]` у метки */
  optional?: boolean;
  /** Справа в строке метки: ссылка («забыли пароль?»), значение, действие */
  aside?: ReactNode;
  /** Счётчик символов `12/190` в строке метки; с `maxLength` краснеет за пределом */
  count?: number;
  maxLength?: number;
  /** Метка и контрол в одну строку (настройки) */
  horizontal?: boolean;
  /** Один контрол из @haunt/ui: Input, Textarea, Select.Trigger… — id и aria подхватит сам */
  children: ReactNode;
}

type CounterTone = 'default' | 'warning' | 'danger';

/** Предупреждение — с 90 % лимита, ошибка — за пределом */
function counterTone(count: number, maxLength?: number): CounterTone {
  if (maxLength === undefined) return 'default';
  if (count > maxLength) return 'danger';

  return count >= maxLength * 0.9 ? 'warning' : 'default';
}

/** Метка + контрол + подсказка/ошибка, связанные через id для скринридера */
export function Field({
  label,
  hint,
  error,
  required,
  optional,
  aside,
  count,
  maxLength,
  horizontal,
  className,
  children,
  ...rest
}: FieldProps) {
  const strings = useUiStrings();
  const id = useId();
  const message = error ?? hint;
  const messageId = message ? `${id}-message` : undefined;
  const hasHeader = Boolean(label) || aside !== undefined || count !== undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy: messageId, invalid: Boolean(error) }}>
      <div className={cx(styles.field, horizontal && styles.horizontal, className)} {...rest}>
        {hasHeader && (
          <div className={styles.header}>
            {label && (
              <Label htmlFor={id} required={required} optional={optional} className={styles.label}>
                {label}
              </Label>
            )}

            {(aside !== undefined || count !== undefined) && (
              <span className={styles.aside}>
                {aside}

                {count !== undefined && (
                  <>
                    <span
                      className={cx(styles.counter, styles[counterTone(count, maxLength)])}
                      aria-hidden
                    >
                      {maxLength === undefined ? count : `${count}/${maxLength}`}
                    </span>

                    {/* «12/190» скринридер читает как дробь — ему отдельная фраза */}
                    <VisuallyHidden.Root>
                      {maxLength === undefined
                        ? strings.field.count(count)
                        : strings.field.countOf(count, maxLength)}
                    </VisuallyHidden.Root>
                  </>
                )}
              </span>
            )}
          </div>
        )}

        <div className={styles.control}>
          {children}

          {message && (
            <span
              id={messageId}
              className={cx(styles.message, Boolean(error) && styles.error)}
              role={error ? 'alert' : undefined}
            >
              {message}
            </span>
          )}
        </div>
      </div>
    </FieldContext.Provider>
  );
}
