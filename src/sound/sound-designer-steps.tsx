import type { CSSProperties } from 'react';

import { Field } from '../field/field';
import { cx } from '../lib/cx';
import { Select } from '../select/select';
import { useUiStrings } from '../strings/ui-strings-context';
import { Text } from '../text/text';
import { ToggleGroup } from '../toggle-group/toggle-group';

import { noteName, SCALE_NAMES, scaleNotes, type ScaleName, type ScaleSpec } from './music';
import { rescale, toggleStepNote, type SequenceSpec } from './sequence';
import { SliderField } from './sound-designer-fields';
import { InstrumentPicker, PitchKeys, ScaleDots } from './sound-designer-pickers';
import { ms, seconds } from './sound-designer-units';
import styles from './sound-designer.module.css';

const STEP_COUNTS = [8, 12, 16] as const;
const OCTAVES = [2, 3, 4, 5] as const;
/** Чёрные клавиши: в хроматике их строки темнее — сетка читается как клавиатура */
const ACCIDENTALS = new Set([1, 3, 6, 8, 10]);

interface StepEditorProps {
  sequence: SequenceSpec;
  onChange: (next: SequenceSpec) => void;
  /** Шаг под курсором проигрывания; null — тишина */
  playhead: number | null;
}

/**
 * Сетка шагов: строка — нота лада (сверху высокие), столбец — шестнадцатая; на шаге сколько угодно нот
 * — аккорд. Тоника транспонирует мотив, лад подтягивает ноты к своим ступеням, октава сдвигает сетку
 */
export function StepEditor({ sequence, onChange, playhead }: StepEditorProps) {
  const strings = useUiStrings().soundDesigner;
  const { scale } = sequence;
  const rows = scaleNotes(scale).reverse();
  const set = (patch: Partial<SequenceSpec>) => onChange({ ...sequence, ...patch });

  const setScale = (patch: Partial<ScaleSpec>) =>
    onChange(rescale(sequence, { ...scale, ...patch }));

  const resize = (count: number) =>
    set({ steps: Array.from({ length: count }, (_, i) => sequence.steps[i] ?? []) });

  return (
    <div className={styles.steps}>
      <div className={cx(styles.toolbar, styles.stepsToolbar)}>
        <Field label={strings.instrument}>
          <InstrumentPicker
            value={sequence.instrument}
            onChange={(instrument) => set({ instrument })}
          />
        </Field>

        <Field label={strings.root}>
          <PitchKeys
            value={scale.root}
            label={strings.root}
            onChange={(root) => setScale({ root })}
          />
        </Field>

        <Field label={strings.scale}>
          <Select.Root
            value={scale.type}
            onValueChange={(type) => setScale({ type: type as ScaleName })}
          >
            <Select.Trigger size="sm" />

            <Select.Content>
              {SCALE_NAMES.map((type) => (
                <Select.Item key={type} value={type} aside={<ScaleDots type={type} />}>
                  {strings.scales[type]}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Field>

        <Field label={strings.octave}>
          <ToggleGroup.Root
            type="single"
            size="sm"
            value={String(scale.octave)}
            aria-label={strings.octave}
            onValueChange={(next) => next && setScale({ octave: Number(next) })}
          >
            {OCTAVES.map((octave) => (
              <ToggleGroup.Item key={octave} value={String(octave)}>
                {octave}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </Field>

        <Field label={strings.stepCount}>
          <ToggleGroup.Root
            type="single"
            size="sm"
            value={String(sequence.steps.length)}
            aria-label={strings.stepCount}
            onValueChange={(next) => next && resize(Number(next))}
          >
            {STEP_COUNTS.map((count) => (
              <ToggleGroup.Item key={count} value={String(count)}>
                {count}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </Field>
      </div>

      <div className={styles.sliders}>
        <SliderField
          label={strings.bpm}
          display={`${sequence.bpm} ${strings.bpmUnit}`}
          min={60}
          max={180}
          step={2}
          value={sequence.bpm}
          onChange={(bpm) => set({ bpm })}
        />

        <SliderField
          label={strings.hitGain}
          display={sequence.gain.toFixed(2)}
          min={0.02}
          max={0.6}
          step={0.01}
          value={sequence.gain}
          onChange={(gain) => set({ gain })}
        />

        <SliderField
          label={strings.ring}
          display={`${ms(sequence.decay)} ${strings.ms}`}
          min={40}
          max={600}
          step={5}
          value={ms(sequence.decay)}
          onChange={(next) => set({ decay: seconds(next) })}
        />
      </div>

      <div
        className={styles.stepGrid}
        style={{ '--steps': sequence.steps.length } as CSSProperties}
      >
        {rows.map((midi) => {
          const name = noteName(midi);
          const pitch = midi % 12;

          return (
            <div
              key={midi}
              className={styles.stepRow}
              data-root={pitch === scale.root ? '' : undefined}
              data-accidental={ACCIDENTALS.has(pitch) ? '' : undefined}
            >
              <span className={styles.stepNote}>{name}</span>

              {sequence.steps.map((notes, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.cell}
                  aria-pressed={notes.includes(midi)}
                  aria-label={strings.step(index + 1, name)}
                  data-beat={index % 4 === 0 ? '' : undefined}
                  data-playhead={playhead === index ? '' : undefined}
                  onClick={() => onChange(toggleStepNote(sequence, index, midi))}
                />
              ))}
            </div>
          );
        })}
      </div>

      <Text size="sm" tone="muted">
        {strings.stepsHint}
      </Text>
    </div>
  );
}
