import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { Minus, Plus } from 'lucide-react';

import { useFieldControl } from '../field/field-context';
import frame from '../field-frame/field-frame.module.css';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import {
  clamp,
  formatNumber,
  parseNumber,
  precisionOf,
  sanitizeNumberText,
  stepNumber,
} from './number';
import styles from './number-input.module.css';

type NativeInputProps = Omit<
  ComponentPropsWithRef<'input'>,
  'size' | 'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'step'
>;

export interface NumberInputProps extends NativeInputProps {
  value?: number | null;
  defaultValue?: number | null;
  /** Новое значение после фиксации: blur, Enter, стрелки, кнопки ± — не на каждый символ */
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Шаг с Shift и PageUp / PageDown; по умолчанию — 10 шагов */
  largeStep?: number;
  /** Единица справа от числа: «сек», «чел.» */
  suffix?: ReactNode;
  /** 24 / 28 / 32 px — как у Input */
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  fullWidth?: boolean;
  incrementLabel?: string;
  decrementLabel?: string;
  /** Класс на рамке; className уходит на сам <input> */
  wrapperClassName?: string;
}

/** Через сколько начинается автоповтор зажатой кнопки и как часто он шагает */
const REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 60;

/**
 * Число в рамке поля с кнопками ±. Стрелки — шаг, Shift — ×10, PageUp / PageDown — крупный шаг,
 * Home / End — границы. Пока человек печатает, значение не зажимается (иначе «1» при min 10 не
 * дать набрать «15») — зажим и нормализация на blur и Enter. Кнопки не берут фокус: клавиатура
 * управляет полем стрелками, а зажатая кнопка повторяет шаг.
 */
export function NumberInput({
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step = 1,
  largeStep = step * 10,
  suffix,
  size = 'md',
  invalid,
  disabled,
  readOnly,
  fullWidth,
  incrementLabel,
  decrementLabel,
  wrapperClassName,
  className,
  onBlur,
  onKeyDown,
  ...rest
}: NumberInputProps) {
  const strings = useUiStrings();
  const control = useFieldControl({ invalid, ...rest });
  const precision = precisionOf(step);
  const bounds = { min, max };

  const [innerValue, setInnerValue] = useState(defaultValue);
  const committed = value !== undefined ? value : innerValue;
  const [text, setText] = useState(() => formatNumber(committed, precision));
  const [shownValue, setShownValue] = useState(committed);

  // Значение пришло снаружи (управляемый режим, сброс формы) — показать его, а не старый ввод
  if (committed !== shownValue) {
    setShownValue(committed);
    setText(formatNumber(committed, precision));
  }

  const commit = (next: number | null) => {
    setText(formatNumber(next, precision));
    setShownValue(next);

    if (next === committed) return;

    setInnerValue(next);
    onValueChange?.(next);
  };

  const commitText = () => {
    const parsed = parseNumber(text);

    commit(parsed === null ? null : clamp(Number(parsed.toFixed(precision)), bounds));
  };

  /** Шаг считается от того, что сейчас в поле, — даже если ввод ещё не зафиксирован */
  const stepBy = (delta: number) => {
    if (disabled || readOnly) return;

    const next = stepNumber(parseNumber(text), delta, step, bounds);

    commit(next);

    // Упёрлись в границу — автоповтор дальше не нужен, а выключенная кнопка не получит pointerup
    if (next === min || next === max) stopRepeat();
  };

  const current = parseNumber(text);
  const atMin = min !== undefined && current !== null && current <= min;
  const atMax = max !== undefined && current !== null && current >= max;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);

    if (event.defaultPrevented) return;

    const amount = event.shiftKey ? largeStep : step;
    const actions: Record<string, () => void> = {
      ArrowUp: () => stepBy(amount),
      ArrowDown: () => stepBy(-amount),
      PageUp: () => stepBy(largeStep),
      PageDown: () => stepBy(-largeStep),
      Enter: commitText,
    };

    if (min !== undefined) actions.Home = () => commit(min);
    if (max !== undefined) actions.End = () => commit(max);

    const action = actions[event.key];

    if (!action) return;

    // Enter фиксирует значение, но не мешает форме отправиться
    if (event.key !== 'Enter') event.preventDefault();

    action();
  };

  const repeat = useRef<{ timer?: number; interval?: number }>({});

  const stopRepeat = () => {
    window.clearTimeout(repeat.current.timer);
    window.clearInterval(repeat.current.interval);
    repeat.current = {};
  };

  useEffect(() => stopRepeat, []);

  /*
   * Автоповтор шагает по готовому значению, а не по тексту из замыкания: за время зажатия компонент
   * перерисуется много раз, и обработчик первого рендера видел бы старое число.
   */
  const latest = useRef({ stepBy });

  useEffect(() => {
    latest.current.stepBy = stepBy;
  });

  const startRepeat = (delta: number) => {
    stepBy(delta);
    stopRepeat();
    repeat.current.timer = window.setTimeout(() => {
      repeat.current.interval = window.setInterval(
        () => latest.current.stepBy(delta),
        REPEAT_INTERVAL_MS,
      );
    }, REPEAT_DELAY_MS);
  };

  const stepButton = (delta: number, label: string, icon: typeof Plus, blocked: boolean) => (
    <IconButton
      label={label}
      size="xs"
      variant="ghost"
      tabIndex={-1}
      className={styles.step}
      disabled={disabled || readOnly || blocked}
      // Кнопка не уводит фокус из поля и не выделяет текст при зажатии
      onPointerDown={(event) => {
        if (event.button !== 0) return;

        event.preventDefault();
        startRepeat(delta);
      }}
      onPointerUp={stopRepeat}
      onPointerLeave={stopRepeat}
      onPointerCancel={stopRepeat}
      // Клик без указателя (скринридер, «нажать» из панели доступности)
      onClick={(event) => {
        if (event.detail === 0) stepBy(delta);
      }}
    >
      <Icon icon={icon} size="xs" />
    </IconButton>
  );

  return (
    <span
      className={cx(
        frame.frame,
        frame[size],
        fullWidth && frame.fullWidth,
        styles.root,
        styles[size],
        wrapperClassName,
      )}
      data-invalid={control.invalid || undefined}
      data-disabled={disabled || undefined}
    >
      {stepButton(-step, decrementLabel ?? strings.numberInput.decrement, Minus, atMin)}

      <input
        type="text"
        role="spinbutton"
        inputMode={precision > 0 || (min ?? -1) < 0 ? 'decimal' : 'numeric'}
        autoComplete="off"
        className={cx(styles.input, className)}
        value={text}
        disabled={disabled}
        readOnly={readOnly}
        aria-valuenow={current ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-invalid={control.invalid || undefined}
        onChange={(event) =>
          setText(
            sanitizeNumberText(event.target.value, min === undefined || min < 0, precision > 0),
          )
        }
        onBlur={(event) => {
          commitText();
          onBlur?.(event);
        }}
        onKeyDown={handleKeyDown}
        {...rest}
        {...control.props}
      />

      {suffix && <span className={styles.suffix}>{suffix}</span>}

      {stepButton(step, incrementLabel ?? strings.numberInput.increment, Plus, atMax)}
    </span>
  );
}
