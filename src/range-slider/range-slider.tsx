import {
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import {
  keyAction,
  moveThumb,
  nearestThumb,
  normalizeRange,
  thumbBounds,
  valueFromRatio,
  valueRatio,
  type RangeValue,
} from './range-math';
import styles from './range-slider.module.css';

export interface RangeSliderProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange' | 'dir'
> {
  value?: RangeValue;
  defaultValue?: RangeValue;
  /** На каждое движение */
  onValueChange?: (value: RangeValue) => void;
  /** Отпустили бегунок или нажали клавишу — время запросить данные */
  onValueCommit?: (value: RangeValue) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Шаг PageUp / PageDown и Shift+стрелки; по умолчанию десять шагов */
  bigStep?: number;
  /** Наименьший зазор между значениями */
  minDistance?: number;
  /** Подписи бегунков для скринридера: нижняя и верхняя граница */
  labels?: readonly [string, string];
  /** Подпись значения над бегунком и для скринридера */
  formatValue?: (value: number) => string;
  /** Подписи значений над бегунками: всегда, только у активного (наведение, фокус, перетаскивание) или нет */
  showValues?: 'always' | 'active' | 'never';
  disabled?: boolean;
  /** Локаль чисел подписи по умолчанию */
  locale?: string;
}

const DEFAULT_VALUE: RangeValue = [25, 75];

/**
 * Диапазон двумя бегунками: цена, длительность, даты в фильтре. Бегунки не проходят друг через друга и
 * держат `minDistance`; дорожка — клик ставит ближний бегунок. Клавиатура у каждого: стрелки,
 * Shift+стрелки и PageUp/PageDown — большой шаг, Home/End — до края (до второго бегунка).
 */
export function RangeSlider({
  value,
  defaultValue = DEFAULT_VALUE,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  bigStep,
  minDistance = 0,
  labels,
  formatValue,
  showValues = 'active',
  disabled,
  locale: localeProp,
  className,
  ...rest
}: RangeSliderProps) {
  const strings = useUiStrings();
  const locale = useUiLocale(localeProp);
  const options = { min, max, step, minDistance };
  const [innerValue, setInnerValue] = useState<RangeValue>(() =>
    normalizeRange(defaultValue, options),
  );
  const [dragging, setDragging] = useState<0 | 1 | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<Array<HTMLSpanElement | null>>([]);
  // Указатель приходит чаще рендеров: перетаскивание читает свежие значения из ref, а не из замыкания
  const draggingRef = useRef<0 | 1 | null>(null);
  const valueRef = useRef<RangeValue | null>(null);

  const current = normalizeRange(value ?? innerValue, options);
  const format = formatValue ?? new Intl.NumberFormat(locale).format;
  const thumbLabels = labels ?? [strings.rangeSlider.min, strings.rangeSlider.max];
  const large = bigStep ?? step * 10;

  const change = (next: RangeValue) => {
    const previous = valueRef.current ?? current;

    if (next[0] === previous[0] && next[1] === previous[1]) return;

    if (draggingRef.current !== null) valueRef.current = next;
    setInnerValue(next);
    onValueChange?.(next);
  };

  const valueAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0) return current[0];

    return valueFromRatio((clientX - rect.left) / rect.width, options);
  };

  // Захват указателя на корне: бегунок идёт за пальцем и за пределами дорожки
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;

    event.preventDefault();

    const target = valueAt(event.clientX);
    const thumb = nearestThumb(current, target);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Указатель уже отпущен (синтетическое событие, тест) — тянем без захвата
    }

    draggingRef.current = thumb;
    valueRef.current = current;
    setDragging(thumb);
    thumbRefs.current[thumb]?.focus({ preventScroll: true });
    change(moveThumb(current, thumb, target, options));
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const thumb = draggingRef.current;

    if (thumb === null) return;

    change(moveThumb(valueRef.current ?? current, thumb, valueAt(event.clientX), options));
  };

  const endDrag = () => {
    if (draggingRef.current === null) return;

    draggingRef.current = null;
    setDragging(null);
    onValueCommit?.(valueRef.current ?? current);
    valueRef.current = null;
  };

  const onKeyDown = (index: 0 | 1) => (event: KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return;

    const action = keyAction(event.key, event.shiftKey, step, large);

    if (!action) return;

    event.preventDefault();

    const [low, high] = thumbBounds(current, index, options);
    const target =
      'delta' in action ? current[index] + action.delta : action.edge === 'start' ? low : high;
    const next = moveThumb(current, index, target, options);

    change(next);
    onValueCommit?.(next);
  };

  const startRatio = valueRatio(current[0], min, max);
  const endRatio = valueRatio(current[1], min, max);

  return (
    <div
      className={cx(styles.root, className)}
      data-disabled={disabled || undefined}
      data-show-values={showValues}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      {...rest}
    >
      <div ref={trackRef} className={styles.track}>
        <div
          className={styles.range}
          style={{ left: `${startRatio * 100}%`, right: `${(1 - endRatio) * 100}%` }}
        />
      </div>

      {([0, 1] as const).map((index) => {
        const [low, high] = thumbBounds(current, index, options);
        const text = format(current[index]);

        return (
          <span
            key={index}
            ref={(node) => {
              thumbRefs.current[index] = node;
            }}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={thumbLabels[index]}
            aria-valuemin={low}
            aria-valuemax={high}
            aria-valuenow={current[index]}
            aria-valuetext={text}
            aria-orientation="horizontal"
            aria-disabled={disabled || undefined}
            className={styles.thumb}
            data-active={dragging === index || undefined}
            // Верхний поверх, пока он не прижат к правому краю: иначе прижатые друг к другу бегунки
            // у правого края нельзя было бы развести — сверху лежал бы тот, что дальше двигаться не может
            data-front={(index === 1) === current[1] < max || undefined}
            style={{ left: `${(index === 0 ? startRatio : endRatio) * 100}%` }}
            onKeyDown={onKeyDown(index)}
          >
            {showValues !== 'never' && (
              <span className={styles.value} aria-hidden>
                {text}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
