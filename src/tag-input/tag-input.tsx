import {
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

import { X } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { useFieldControl } from '../field/field-context';
import frame from '../field-frame/field-frame.module.css';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './tag-input.module.css';
import { addTags, splitTags, type TagValidator } from './tags';

export interface TagInputProps {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (tags: string[]) => void;
  placeholder?: string;
  /** Сколько тегов можно добавить; сверх лимита — ошибка «Не больше N» */
  max?: number;
  /** Проверка тега: вернуть текст ошибки, чтобы не добавлять; ошибка показывается под полем */
  validate?: TagValidator;
  /** Подпись кнопки снятия тега для скринридера */
  removeLabel?: (tag: string) => string;
  /** 24 / 28 / 32 px в одну строку; теги переносятся, и поле растёт по высоте */
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  id?: string;
  /** Имя скрытого поля формы: теги уходят через запятую */
  name?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Теги-чипы внутри рамки поля и ввод за ними. Enter и запятая добавляют, Backspace на пустом вводе
 * снимает последний, вставка «a, b, c» добавляет списком. Дубль не добавляется — уже стоящий тег
 * вспыхивает, чтобы было видно, где он. Ошибка валидатора — под полем, до следующего ввода.
 */
export function TagInput({
  value,
  defaultValue = [],
  onValueChange,
  placeholder,
  max,
  validate,
  removeLabel,
  size = 'md',
  invalid,
  disabled,
  fullWidth,
  id,
  name,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: TagInputProps) {
  const strings = useUiStrings();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [innerTags, setInnerTags] = useState(defaultValue);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ tag: string; count: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const tags = value ?? innerTags;
  const control = useFieldControl({ id, invalid, 'aria-describedby': ariaDescribedBy });
  const describedBy = [control.props['aria-describedby'], error ? errorId : undefined]
    .filter(Boolean)
    .join(' ');

  const commit = (next: string[]) => {
    setInnerTags(next);
    onValueChange?.(next);
  };

  /** Возвращает то, что не вошло, — оно остаётся в поле, чтобы его можно было поправить */
  const add = (candidates: string[]): string => {
    const result = addTags(tags, candidates, {
      max,
      validate,
      maxMessage: strings.tagInput.max,
    });
    const failed = result.rejected.find((rejection) => rejection.message);
    const duplicate = result.rejected.find((rejection) => rejection.reason === 'duplicate');

    if (result.added.length > 0) {
      commit(result.tags);
      setAnnouncement(strings.tagInput.added(result.added));
    }

    if (duplicate) {
      setFlash((current) => ({ tag: duplicate.tag, count: (current?.count ?? 0) + 1 }));
    }

    setError(failed?.message ?? null);

    return result.rejected
      .filter((rejection) => rejection.reason !== 'duplicate')
      .map((rejection) => rejection.tag)
      .join(', ');
  };

  const remove = (index: number) => {
    const tag = tags[index];

    commit(tags.filter((_, tagIndex) => tagIndex !== index));
    setAnnouncement(strings.tagInput.removed(tag ?? ''));
    setError(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter на пустом вводе не перехватываем — пусть отправляет форму
      if (!draft.trim()) {
        if (event.key === ',') event.preventDefault();

        return;
      }

      event.preventDefault();
      setDraft(add([draft]));

      return;
    }

    if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      event.preventDefault();
      remove(tags.length - 1);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');

    // Одно слово вставляется как обычный текст — его ещё можно дописать
    if (!/[,;\n\r\t]/.test(text)) return;

    event.preventDefault();
    setDraft(add(splitTags(draft + text)));
  };

  /** Пустое место рамки или текст тега — не контрол: клик по ним ведёт в ввод */
  const isBackground = (event: MouseEvent<HTMLDivElement>) =>
    !(event.target as HTMLElement).closest('button, input');

  return (
    <div className={cx(styles.root, fullWidth && styles.fullWidth, className)}>
      <div
        className={cx(
          frame.frame,
          frame[size],
          fullWidth && frame.fullWidth,
          styles.frame,
          styles[size],
        )}
        data-invalid={control.invalid || error ? '' : undefined}
        data-disabled={disabled || undefined}
        onMouseDown={(event) => {
          // Без этого mousedown по фону снял бы фокус с ввода до того, как click вернёт его
          if (isBackground(event)) event.preventDefault();
        }}
        onClick={(event) => {
          if (isBackground(event)) inputRef.current?.focus();
        }}
      >
        <ul className={styles.tags} aria-label={strings.tagInput.list}>
          {tags.map((tag, index) => {
            const flashing =
              flash !== null && flash.tag.toLocaleLowerCase() === tag.toLocaleLowerCase();

            return (
              <li
                // Перемонтирование по счётчику перезапускает вспышку у того же тега
                key={flashing ? `${tag}-${flash.count}` : tag}
                className={cx(styles.tag, flashing && styles.flash)}
              >
                <span className={styles.tagText}>{tag}</span>

                <button
                  type="button"
                  className={styles.remove}
                  aria-label={(removeLabel ?? strings.tagInput.remove)(tag)}
                  disabled={disabled}
                  onClick={() => {
                    remove(index);
                    inputRef.current?.focus();
                  }}
                >
                  <Icon icon={X} size="xs" />
                </button>
              </li>
            );
          })}
        </ul>

        <input
          ref={inputRef}
          className={styles.input}
          value={draft}
          placeholder={tags.length === 0 ? placeholder : undefined}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={control.invalid || Boolean(error) || undefined}
          autoComplete="off"
          enterKeyHint="enter"
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          {...control.props}
          aria-describedby={describedBy || undefined}
        />
      </div>

      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}

      {name && <input type="hidden" name={name} value={tags.join(',')} />}

      <VisuallyHidden.Root role="status">{announcement}</VisuallyHidden.Root>
    </div>
  );
}
