import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

import { Pencil } from 'lucide-react';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { Spinner } from '../spinner/spinner';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './inline-edit.module.css';

export interface InlineEditProps extends Omit<
  ComponentPropsWithRef<'span'>,
  'onChange' | 'defaultValue' | 'children'
> {
  value?: string;
  defaultValue?: string;
  /**
   * Сохранить. Промис — пока он идёт, рядом спиннер и уже новое значение; отказ — значение
   * откатывается, рядом ошибка (текст `Error` или `errorText`)
   */
  onSave: (value: string) => void | Promise<void>;
  /** Текст ошибки, если значение не годится: правка не закрывается */
  validate?: (value: string) => string | null | undefined;
  /** Что показать вместо пустого значения */
  placeholder?: string;
  maxLength?: number;
  /** Подпись поля для скринридера; по умолчанию «Новое значение» */
  inputLabel?: string;
  /** Текст ошибки при отказе `onSave` без своего сообщения */
  errorText?: string;
  /** Пробелы по краям отрезаются перед проверкой и сохранением; по умолчанию да */
  trim?: boolean;
  disabled?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /**
   * Не больше стольких символов в покое: остаток — многоточием. Полный текст — в подсказке и для
   * скринридера; в правке поле показывает всё
   */
  maxChars?: number;
  /**
   * Не шире этого в покое: число — px, строка — любая CSS-длина (`'24ch'`, `'40%'`). Без него текст
   * обрезается, только когда не помещается в контейнер
   */
  maxWidth?: number | string;
}

/** Первые `limit` символов (по кодовым точкам — эмодзи не рвётся) и многоточие, если текст длиннее */
function clip(text: string, limit: number | undefined): string {
  if (limit === undefined) return text;

  const chars = Array.from(text);

  return chars.length > limit ? `${chars.slice(0, Math.max(0, limit)).join('').trimEnd()}…` : text;
}

type Mode = 'view' | 'edit';

/**
 * Текст, который правится на месте: название канала, тема, имя роли. Клик, Enter или F2 — правка;
 * Enter и уход фокуса — сохранить, Esc — отменить. Шрифт — родителя: в заголовке поле того же кегля,
 * текст при переходе в правку не прыгает.
 */
export function InlineEdit({
  value,
  defaultValue = '',
  onSave,
  validate,
  placeholder,
  maxLength,
  inputLabel,
  errorText,
  trim = true,
  disabled,
  onEditingChange,
  maxChars,
  maxWidth,
  className,
  style,
  ...rest
}: InlineEditProps) {
  const strings = useUiStrings();
  const errorId = useId();
  const [innerValue, setInnerValue] = useState(defaultValue);
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Значение, которое сохраняется прямо сейчас: показываем его, пока промис не ответил */
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLButtonElement>(null);
  /** Вернуть фокус на текст после правки — только если правку закрыли клавишей, а не уходом фокуса */
  const refocusRef = useRef(false);
  const attemptRef = useRef(0);
  // Enter закрывает правку, и поле, уходя из DOM, может ещё прислать blur — второй раз не сохраняем
  const editingRef = useRef(false);

  const committed = value ?? innerValue;
  const shown = pending ?? committed;
  const saving = pending !== null;

  const setEditing = (next: Mode) => {
    editingRef.current = next === 'edit';
    setMode(next);
    onEditingChange?.(next === 'edit');
  };

  const start = () => {
    if (disabled || saving) return;

    setDraft(committed);
    setError(null);
    setEditing('edit');
  };

  const cancel = () => {
    refocusRef.current = true;
    setError(null);
    setEditing('view');
  };

  const save = async (byKey: boolean) => {
    if (!editingRef.current) return;

    const next = trim ? draft.trim() : draft;

    if (next === committed) {
      refocusRef.current = byKey;
      setEditing('view');

      return;
    }

    const problem = validate?.(next);

    if (problem) {
      setError(problem);

      return;
    }

    refocusRef.current = byKey;
    setError(null);
    setEditing('view');

    const result = onSave(next);

    if (!result || typeof (result as Promise<void>).then !== 'function') {
      setInnerValue(next);

      return;
    }

    // Пока идёт сохранение, новое могут начать править и сохранить ещё раз — отвечает только последнее
    const attempt = ++attemptRef.current;

    setPending(next);

    try {
      await result;

      if (attempt !== attemptRef.current) return;

      setInnerValue(next);
    } catch (reason) {
      if (attempt !== attemptRef.current) return;

      const message = reason instanceof Error && reason.message ? reason.message : null;

      setError(errorText ?? message ?? strings.inlineEdit.saveFailed);
    } finally {
      if (attempt === attemptRef.current) setPending(null);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      void save(true);
    }

    if (event.key === 'Escape') {
      // Esc закрывает правку, а не диалог или поповер вокруг
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  };

  useLayoutEffect(() => {
    if (mode === 'edit') {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (refocusRef.current) {
      refocusRef.current = false;
      displayRef.current?.focus();
    }
  }, [mode]);

  return (
    <span
      className={cx(styles.root, className)}
      data-editing={mode === 'edit' || undefined}
      data-saving={saving || undefined}
      style={
        maxWidth === undefined
          ? style
          : ({
              '--inline-edit-max': typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
              ...style,
            } as CSSProperties)
      }
      {...rest}
    >
      {mode === 'edit' ? (
        <input
          ref={inputRef}
          className={styles.input}
          value={draft}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={inputLabel ?? strings.inlineEdit.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => void save(false)}
        />
      ) : (
        <button
          ref={displayRef}
          type="button"
          className={styles.display}
          disabled={disabled}
          aria-label={strings.inlineEdit.edit(shown || placeholder || strings.inlineEdit.empty)}
          aria-describedby={error ? errorId : undefined}
          data-empty={shown ? undefined : ''}
          onClick={start}
          onKeyDown={(event) => {
            if (event.key === 'F2') {
              event.preventDefault();
              start();
            }
          }}
        >
          <span
            className={styles.text}
            // Полный текст подсказкой — только когда он не виден целиком: обрезан по символам или по ширине
            onPointerEnter={(event) => {
              const element = event.currentTarget;
              const cut =
                element.scrollWidth > element.clientWidth || clip(shown, maxChars) !== shown;

              element.title = cut ? shown : '';
            }}
          >
            {shown ? clip(shown, maxChars) : placeholder || strings.inlineEdit.empty}
          </span>

          {saving ? (
            <Spinner size="sm" label={strings.inlineEdit.saving} className={styles.status} />
          ) : (
            <Icon icon={Pencil} size="xs" className={styles.pencil} />
          )}
        </button>
      )}

      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
