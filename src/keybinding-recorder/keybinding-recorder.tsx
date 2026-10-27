import { useId, useRef, useState, type KeyboardEvent } from 'react';

import { RotateCcw, X } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { Caret } from '../caret/caret';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { Kbd } from '../kbd/kbd';
import { currentPlatform, formatHotkey, isApplePlatform } from '../lib/hotkey';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import {
  comboFromEvent,
  modifiersFromEvent,
  modifiersLabel,
  needsModifier,
  normalizeCombo,
  platformModifiers,
  sameCombo,
} from './keybinding';
import styles from './keybinding-recorder.module.css';

export interface KeybindingRecorderProps {
  /** Сочетание в формате `useHotkey` (`mod+shift+k`); null — не задано */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (combo: string | null) => void;
  /** Сочетание по умолчанию: есть и отличается от текущего — кнопка «вернуть» */
  defaultBinding?: string | null;
  /** Кем занято сочетание: подпись действия или null. Занятое не записывается, если не `allowConflicts` */
  conflict?: (combo: string) => string | null | undefined;
  /** Записать и занятое — с предупреждением (настройка сама переназначит другое действие) */
  allowConflicts?: boolean;
  /** Печатное без Ctrl / Alt / ⌘ не записывать — оно срабатывало бы посреди набора; по умолчанию да */
  requireModifier?: boolean;
  /** Кнопка «убрать сочетание»; по умолчанию да */
  clearable?: boolean;
  disabled?: boolean;
  /** Платформа подписей и `mod`; по умолчанию — текущая */
  apple?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

type Notice = { tone: 'error' | 'warning'; text: string } | null;

/**
 * Запись сочетания клавиш в настройках. Нажали кнопку — «нажмите сочетание», зажатые модификаторы
 * видны сразу, первая обычная клавиша завершает запись. Esc — отмена, Tab — уйти без записи (клавиатуре
 * нельзя ловушку). Занятое (`conflict`) и печатное без модификатора не записываются — объяснение под
 * кнопкой. Вывод — `formatHotkey`: `Ctrl+Shift+K` или `⇧⌘K`.
 */
export function KeybindingRecorder({
  value,
  defaultValue = null,
  onValueChange,
  defaultBinding,
  conflict,
  allowConflicts,
  requireModifier = true,
  clearable = true,
  disabled,
  apple: appleProp,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: KeybindingRecorderProps) {
  const strings = useUiStrings().keybindingRecorder;
  const apple = appleProp ?? isApplePlatform(currentPlatform());
  const noticeId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [innerValue, setInnerValue] = useState(defaultValue);
  const [recording, setRecording] = useState(false);
  const [held, setHeld] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [announcement, setAnnouncement] = useState('');
  // Пробел нажимает кнопку на keyup: записанное Ctrl+Space иначе тут же начало бы запись заново
  const swallowKeyUpRef = useRef(false);

  const combo = value !== undefined ? value : innerValue;
  const label = combo ? formatHotkey(combo, apple) : null;
  const canReset =
    defaultBinding !== undefined &&
    (combo === null || defaultBinding === null
      ? combo !== defaultBinding
      : !sameCombo(combo, defaultBinding, apple));

  const commit = (next: string | null) => {
    setInnerValue(next);
    onValueChange?.(next);
  };

  const stop = () => {
    setRecording(false);
    setHeld('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!recording) return;

    // Tab уводит фокус как обычно: запись не держит клавиатуру
    if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      stop();

      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (
      event.key === 'Escape' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      stop();
      setNotice(null);

      return;
    }

    const recorded = comboFromEvent(event.nativeEvent, apple);

    if (!recorded) {
      setHeld(modifiersLabel(modifiersFromEvent(event.nativeEvent, apple), apple));

      return;
    }

    const next = normalizeCombo(recorded);
    const shown = formatHotkey(next, apple);

    if (requireModifier && needsModifier(next)) {
      setHeld('');
      setNotice({ tone: 'error', text: strings.needsModifier(platformModifiers(apple)) });

      return;
    }

    const takenBy = combo && sameCombo(combo, next, apple) ? null : conflict?.(next);

    if (takenBy && !allowConflicts) {
      setHeld('');
      setNotice({ tone: 'error', text: strings.conflict(takenBy) });

      return;
    }

    swallowKeyUpRef.current = true;
    stop();
    setNotice(takenBy ? { tone: 'warning', text: strings.conflict(takenBy) } : null);
    setAnnouncement(strings.recorded(shown));
    commit(next);
  };

  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (swallowKeyUpRef.current || recording) {
      if (event.key === ' ') event.preventDefault();

      swallowKeyUpRef.current = false;
    }

    if (!recording) return;

    setHeld(modifiersLabel(modifiersFromEvent(event.nativeEvent, apple), apple));
  };

  const describedBy = [ariaDescribedBy, notice ? noticeId : undefined].filter(Boolean).join(' ');

  return (
    <div className={cx(styles.root, className)}>
      <div className={styles.row}>
        <button
          ref={buttonRef}
          id={id}
          type="button"
          className={styles.recorder}
          data-recording={recording || undefined}
          data-empty={combo ? undefined : ''}
          disabled={disabled}
          aria-label={ariaLabel ?? (label ? strings.change(label) : strings.record)}
          aria-describedby={describedBy || undefined}
          aria-pressed={recording}
          onClick={() => {
            if (recording) return;

            setRecording(true);
            setNotice(null);
          }}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={stop}
        >
          {recording ? (
            <span className={styles.prompt}>
              {held ? <Kbd size="sm">{held}</Kbd> : strings.recording}

              <Caret shape="bar" />
            </span>
          ) : label ? (
            <Kbd size="sm">{label}</Kbd>
          ) : (
            <span className={styles.none}>{strings.none}</span>
          )}
        </button>

        {clearable && combo && !recording && (
          <IconButton
            label={strings.clear}
            size="sm"
            disabled={disabled}
            onClick={() => {
              commit(null);
              setNotice(null);
              buttonRef.current?.focus();
            }}
          >
            <Icon icon={X} size="sm" />
          </IconButton>
        )}

        {canReset && !recording && (
          <IconButton
            label={strings.reset}
            size="sm"
            disabled={disabled}
            onClick={() => {
              commit(defaultBinding ?? null);
              setNotice(null);
              buttonRef.current?.focus();
            }}
          >
            <Icon icon={RotateCcw} size="sm" />
          </IconButton>
        )}
      </div>

      {notice ? (
        <span
          id={noticeId}
          className={cx(styles.notice, styles[notice.tone])}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </span>
      ) : (
        recording && <span className={styles.hint}>{strings.cancelHint}</span>
      )}

      <VisuallyHidden.Root role="status">{announcement}</VisuallyHidden.Root>
    </div>
  );
}
