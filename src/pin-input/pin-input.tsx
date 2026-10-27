import { Fragment, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

import { useFieldControl } from '../field/field-context';
import frame from '../field-frame/field-frame.module.css';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import { insertPin, removePin, type PinEdit, type PinType } from './pin';
import styles from './pin-input.module.css';

export interface PinInputProps {
  /** Число ячеек */
  length?: number;
  /** numeric — цифры и цифровая клавиатура на телефоне; alphanumeric — латиница и цифры */
  type?: PinType;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Код набран целиком — момент, когда его можно отправлять */
  onComplete?: (value: string) => void;
  /** Подпись группы для скринридера: «Код из письма» */
  label?: string;
  /** Разделитель после каждых N ячеек: 3 — «123 – 456» */
  groupSize?: number;
  /** Скрыть символы точками — для PIN, а не для одноразовых кодов */
  mask?: boolean;
  /** Квадратные ячейки 24 / 28 / 32 px */
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-describedby'?: string;
}

/**
 * Код из отдельных моно-ячеек: вход, 2FA, код приглашения. Ввод переводит фокус дальше, Backspace —
 * назад, вставка заполняет код целиком, стрелки и Home / End ходят по ячейкам. Каждая ячейка —
 * свой <input>: так работают автозаполнение одноразового кода и выделение одной ячейки.
 */
export function PinInput({
  length = 6,
  type = 'numeric',
  value,
  defaultValue = '',
  onValueChange,
  onComplete,
  label,
  groupSize,
  mask,
  size = 'lg',
  invalid,
  disabled,
  autoFocus,
  id,
  name,
  className,
  'aria-describedby': ariaDescribedBy,
}: PinInputProps) {
  const strings = useUiStrings();
  const control = useFieldControl({ id, invalid, 'aria-describedby': ariaDescribedBy });
  const cells = useRef<Array<HTMLInputElement | null>>([]);
  // Переход фокуса из кода: onFocus не должен перенаправлять его по ещё не обновлённому значению
  const movingFocus = useRef(false);
  const [innerValue, setInnerValue] = useState(defaultValue.slice(0, length));

  const current = (value ?? innerValue).slice(0, length);

  const focusCell = (index: number) => {
    const cell = cells.current[Math.max(0, Math.min(index, length - 1))];

    movingFocus.current = true;
    cell?.focus();
    cell?.select();
    movingFocus.current = false;
  };

  const apply = (edit: PinEdit) => {
    if (edit.value !== current) {
      setInnerValue(edit.value);
      onValueChange?.(edit.value);

      if (edit.value.length === length && current.length < length) onComplete?.(edit.value);
    }

    focusCell(edit.focus);
  };

  const onInput = (index: number, text: string) => {
    const previous = current[index] ?? '';

    // Автозаполнение и экранные клавиатуры: если выделение сбилось, в поле «старый + новый» — берём новый
    const typed =
      previous && text.length > 1 && text.includes(previous) ? text.replace(previous, '') : text;

    apply(insertPin(current, index, typed, length, type));
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowRight: Math.min(index + 1, current.length),
      Home: 0,
      End: Math.min(current.length, length - 1),
    };

    const target = moves[event.key];

    if (target !== undefined) {
      event.preventDefault();
      focusCell(target);

      return;
    }

    // Набор с клавиатуры — здесь, а не в onChange: тот же символ поверх выделенного не меняет значение,
    // и React не прислал бы onChange — фокус не ушёл бы дальше
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

    if (printable) {
      event.preventDefault();
      apply(insertPin(current, index, event.key, length, type));

      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      apply(removePin(current, index));
    }
  };

  const onPaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    apply(insertPin(current, index, event.clipboardData.getData('text'), length, type));
  };

  /** Код без дыр: фокус в ячейку дальше заполненных уходит в первую пустую */
  const onFocus = (index: number) => {
    if (!movingFocus.current && index > current.length) {
      focusCell(current.length);

      return;
    }

    cells.current[index]?.select();
  };

  return (
    <div
      role="group"
      aria-label={label ?? strings.pinInput.label}
      aria-describedby={control.props['aria-describedby']}
      className={cx(styles.root, className)}
      data-disabled={disabled || undefined}
    >
      {Array.from({ length }, (_, index) => {
        const char = current[index] ?? '';

        return (
          <Fragment key={index}>
            {groupSize && index > 0 && index % groupSize === 0 && (
              <span className={styles.separator} aria-hidden />
            )}

            <input
              ref={(element) => {
                cells.current[index] = element;
              }}
              id={index === 0 ? control.props.id : undefined}
              className={cx(frame.frame, frame[size], styles.cell, styles[size])}
              type={mask ? 'password' : 'text'}
              inputMode={type === 'numeric' ? 'numeric' : 'text'}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              autoCapitalize={type === 'alphanumeric' ? 'characters' : 'off'}
              spellCheck={false}
              autoFocus={autoFocus && index === 0}
              disabled={disabled}
              value={char}
              aria-label={strings.pinInput.cell(index + 1, length)}
              aria-invalid={control.invalid || undefined}
              data-invalid={control.invalid || undefined}
              data-disabled={disabled || undefined}
              data-filled={char ? '' : undefined}
              onChange={(event) => onInput(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              onPaste={(event) => onPaste(index, event)}
              onFocus={() => onFocus(index)}
            />
          </Fragment>
        );
      })}

      {name && <input type="hidden" name={name} value={current} />}
    </div>
  );
}
