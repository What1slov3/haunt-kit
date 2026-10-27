import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';

import { useUiStrings } from '../strings/ui-strings-context';
import { ToggleGroup } from '../toggle-group/toggle-group';

import { PITCH_CLASSES, SCALES, type ScaleName } from './music';
import { INSTRUMENTS, instrumentVoices, type Instrument } from './sequence';
import { drawPeaks } from './sound-designer-draw';
import styles from './sound-designer.module.css';

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
/** Чёрная клавиша — на стыке белых: номер белой слева от неё */
const BLACK_KEYS: [pitch: number, after: number][] = [
  [1, 0],
  [3, 1],
  [6, 3],
  [8, 4],
  [10, 5],
];

interface PitchKeysProps {
  value: number;
  onChange: (pitch: number) => void;
  label: string;
}

/**
 * Тоника — октава клавиатуры: выбор одной клавиши, как группа радиокнопок. Стрелки идут по полутонам
 * по кругу; фокус — только у выбранной клавиши, Tab выходит из клавиатуры одним нажатием
 */
export function PitchKeys({ value, onChange, label }: PitchKeysProps) {
  const keys = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent) => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowUp';
    const back = event.key === 'ArrowLeft' || event.key === 'ArrowDown';

    if (!forward && !back) return;

    event.preventDefault();

    const next = (value + (forward ? 1 : 11)) % 12;

    onChange(next);
    keys.current[next]?.focus();
  };

  const key = (pitch: number, className: string, style?: CSSProperties) => (
    <button
      key={pitch}
      ref={(node) => {
        keys.current[pitch] = node;
      }}
      type="button"
      role="radio"
      aria-checked={value === pitch}
      aria-label={PITCH_CLASSES[pitch]}
      tabIndex={value === pitch ? 0 : -1}
      className={className}
      style={style}
      onClick={() => onChange(pitch)}
    />
  );

  return (
    <div role="radiogroup" aria-label={label} className={styles.keys} onKeyDown={onKeyDown}>
      {WHITE_KEYS.map((pitch) => key(pitch, styles.whiteKey!))}
      {BLACK_KEYS.map(([pitch, after]) =>
        key(pitch, styles.blackKey!, { '--after': after } as CSSProperties),
      )}
    </div>
  );
}

/** Рисунок лада: двенадцать полутонов, ступени лада закрашены, тоника — акцентом */
export function ScaleDots({ type }: { type: ScaleName }) {
  const degrees = new Set<number>(SCALES[type]);

  return (
    <span className={styles.dots} aria-hidden>
      {PITCH_CLASSES.map((_, step) => (
        <span
          key={step}
          className={styles.dot}
          data-on={degrees.has(step) ? '' : undefined}
          data-root={step === 0 ? '' : undefined}
        />
      ))}
    </span>
  );
}

/** Удар инструмента нарисован один раз на страницу: форма волны не меняется, а рендер — офлайн-синтез */
const strikes = new Map<Instrument, Promise<Float32Array>>();

function strike(instrument: Instrument): Promise<Float32Array> {
  let samples = strikes.get(instrument);

  if (!samples) {
    samples = import('./synth').then(({ renderSound }) =>
      renderSound(
        {
          minLevel: 'subtle',
          minInterval: 0,
          voices: instrumentVoices(instrument, 440, 0.9, 0.25),
        },
        1,
        8000,
      ),
    );
    strikes.set(instrument, samples);
  }

  return samples;
}

function StrikeShape({ instrument }: { instrument: Instrument }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    void strike(instrument)
      .then((samples) => {
        if (!cancelled && ref.current) drawPeaks(ref.current, samples);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [instrument]);

  return <canvas ref={ref} className={styles.strike} aria-hidden />;
}

interface InstrumentPickerProps {
  value: Instrument;
  onChange: (instrument: Instrument) => void;
}

/** Инструмент — плитки с формой удара: разница между щипком и выдохом видна до того, как услышишь */
export function InstrumentPicker({ value, onChange }: InstrumentPickerProps) {
  const strings = useUiStrings().soundDesigner;

  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={strings.instrument}
      className={styles.instruments}
      onValueChange={(next) => next && onChange(next as Instrument)}
    >
      {INSTRUMENTS.map((instrument) => (
        <ToggleGroup.Item key={instrument} value={instrument} className={styles.instrument}>
          <StrikeShape instrument={instrument} />

          {strings.instruments[instrument]}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
