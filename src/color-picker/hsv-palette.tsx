import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { useUiStrings } from '../strings/ui-strings-context';

import { hexToHsv, hsvToHex, type Hsv } from './color';
import styles from './color-picker.module.css';
import { areaFromPoint, hueFromPoint, nudgeArea, nudgeHue } from './hsv-controls';

export interface HsvPaletteProps {
  /** `#rrggbb` */
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}

const percent = (value: number) => Math.round(value * 100);

/**
 * Квадрат насыщенность × яркость и полоса оттенка, оба — `role="slider"` с клавиатурой. HSV держится в
 * своём состоянии, а не выводится из hex: у серого и чёрного нет оттенка, и без этого ручка оттенка
 * прыгала бы в красный, стоит протащить курсор через угол квадрата.
 */
export function HsvPalette({ value, onChange, disabled }: HsvPaletteProps) {
  const text = useUiStrings().colorPicker;
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hsvOf, setHsvOf] = useState(value);

  // Цвет сменился снаружи (свотч, hex-поле) — оттенок и насыщенность серого берутся из прежних
  if (value !== hsvOf) {
    setHsvOf(value);
    setHsv(hexToHsv(value, hsv));
  }

  // Слушатели перетаскивания живут дольше рендера, в котором их повесили, — читают свежее отсюда
  const latest = useRef({ hsv, onChange });

  useEffect(() => {
    latest.current = { hsv, onChange };
  });

  const update = (patch: Partial<Hsv>) => {
    const next = { ...latest.current.hsv, ...patch };
    const hex = hsvToHex(next);

    latest.current.hsv = next;
    setHsv(next);
    setHsvOf(hex);
    latest.current.onChange(hex);
  };

  // Захват указателя: курсор может уйти за квадрат, а цвет продолжает следовать за ним до отпускания
  const drag =
    (apply: (point: { clientX: number; clientY: number }, box: DOMRect) => void) =>
    (event: PointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0) return;

      const target = event.currentTarget;

      event.preventDefault();
      target.focus();

      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Синтетическое событие (тесты, автоматизация) — захватывать нечего, слушатели ниже всё равно работают
      }

      apply(event, target.getBoundingClientRect());

      const move = (moveEvent: globalThis.PointerEvent) =>
        apply(moveEvent, target.getBoundingClientRect());
      const stop = () => {
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', stop);
        target.removeEventListener('pointercancel', stop);
      };

      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', stop);
      target.addEventListener('pointercancel', stop);
    };

  const onAreaKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nudgeArea(hsv, event.key, event.shiftKey);

    if (!next || disabled) return;

    event.preventDefault();
    update(next);
  };

  const onHueKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const h = nudgeHue(hsv.h, event.key, event.shiftKey);

    if (h === null || disabled) return;

    event.preventDefault();
    update({ h });
  };

  return (
    <div className={styles.palette}>
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={text.saturationBrightness}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent(hsv.s)}
        aria-valuetext={text.saturationBrightnessValue(percent(hsv.s), percent(hsv.v))}
        aria-disabled={disabled || undefined}
        className={styles.area}
        style={{ '--hue-color': `hsl(${hsv.h} 100% 50%)` } as CSSProperties}
        onPointerDown={drag((event, box) =>
          update(areaFromPoint(event.clientX, event.clientY, box)),
        )}
        onKeyDown={onAreaKey}
      >
        <span
          className={styles.thumb}
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: value,
          }}
        />
      </div>

      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={text.hue}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(hsv.h)}
        aria-valuetext={`${Math.round(hsv.h)}°`}
        aria-disabled={disabled || undefined}
        className={styles.hue}
        onPointerDown={drag((event, box) => update({ h: hueFromPoint(event.clientX, box) }))}
        onKeyDown={onHueKey}
      >
        <span
          className={styles.thumb}
          style={{ left: `${(hsv.h / 359) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }}
        />
      </div>
    </div>
  );
}
