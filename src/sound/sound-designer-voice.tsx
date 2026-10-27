import { Trash2 } from 'lucide-react';

import { Field } from '../field/field';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { NumberInput } from '../number-input/number-input';
import { Select } from '../select/select';
import { useUiStrings } from '../strings/ui-strings-context';

import { SliderField } from './sound-designer-fields';
import { frequencyToMidi, midiToFrequency, noteName } from './music';
import { ms, seconds } from './sound-designer-units';
import styles from './sound-designer.module.css';
import {
  type FmSpec,
  type Lfo,
  type NoiseColor,
  type NoiseVoice,
  type ToneVoice,
  type Voice,
  type Wave,
} from './sounds';

const WAVES: readonly Wave[] = ['sine', 'triangle', 'square', 'sawtooth', 'pulse'];
const FILTERS = ['lowpass', 'highpass', 'bandpass'] as const;
const COLORS: readonly NoiseColor[] = ['white', 'pink', 'brown'];
/** Целые — гармонично, дробные — металл и стекло; 1.41 и 2.76 — колокольные */
const FM_RATIOS = [0.5, 1, 1.41, 2, 2.76, 3, 3.5, 4, 5.4, 7];
/** Хроматика от C3 до B6: весь регистр, в котором звуки набора и мотивы живут */
const NOTES = Array.from({ length: 48 }, (_, i) => 48 + i);

export type VoicePatch = Partial<ToneVoice> | Partial<NoiseVoice>;

/** Нота частоты, если частота на ней (в пределах 5 центов); иначе в выборе пусто — частота своя */
function nearestNote(frequency: number): number | undefined {
  const midi = Math.round(frequencyToMidi(frequency));

  return Math.abs(frequencyToMidi(frequency) - midi) < 0.05 ? midi : undefined;
}

interface VoiceCardProps {
  voice: Voice;
  index: number;
  onChange: (patch: VoicePatch) => void;
  onRemove: () => void;
}

/** Карточка голоса: источник, громкость и огибающая; тембр и движение — под раскрытием */
export function VoiceCard({ voice, index, onChange, onRemove }: VoiceCardProps) {
  const strings = useUiStrings().soundDesigner;
  const hz = (value: number) => `${value.toFixed(1)} ${strings.hz}`;

  // Пары «частота | глубина» стоят в одной строке сетки — порядок полей ниже держит их рядом
  // Объект остаётся и на нуле: движок нулевую глубину пропускает, а значения не теряются между правками
  const lfo = (current: Lfo | undefined, patch: Partial<Lfo>): Lfo => ({
    rate: 0,
    depth: 0,
    ...current,
    ...patch,
  });

  const lfoFields = (
    key: 'vibrato' | 'tremolo' | 'wobble',
    current: Lfo | undefined,
    set: (next: Lfo) => void,
    depth: { max: number; step: number; format: (value: number) => string },
  ) => {
    const active = !!current && current.rate > 0 && current.depth > 0;

    return (
      <>
        <SliderField
          label={strings[key]}
          display={active ? hz(current.rate) : strings.off}
          min={0}
          max={16}
          step={0.1}
          value={current?.rate ?? 0}
          onChange={(rate) => set(lfo(current, { rate }))}
        />

        <SliderField
          label={strings.depth}
          display={depth.format(current?.depth ?? 0)}
          min={0}
          max={depth.max}
          step={depth.step}
          value={current?.depth ?? 0}
          onChange={(value) => set(lfo(current, { depth: value }))}
        />
      </>
    );
  };

  const filterWobble = voice.filter
    ? lfoFields(
        'wobble',
        voice.filter.lfo,
        (next) => onChange({ filter: { ...voice.filter!, lfo: next } } as VoicePatch),
        { max: 1, step: 0.01, format: (value) => value.toFixed(2) },
      )
    : null;

  const tremolo = lfoFields('tremolo', voice.tremolo, (next) => onChange({ tremolo: next }), {
    max: 1,
    step: 0.01,
    format: (value) => value.toFixed(2),
  });

  const drive = (
    <SliderField
      label={strings.drive}
      display={voice.drive ? voice.drive.toFixed(2) : strings.off}
      min={0}
      max={1}
      step={0.01}
      value={voice.drive ?? 0}
      onChange={(next) => onChange({ drive: next || undefined })}
    />
  );

  return (
    <li className={styles.voice} data-kind={voice.kind}>
      <div className={styles.voiceHead}>
        <span className={styles.voiceTitle}>
          {strings.voice(index + 1)} · {strings.kinds[voice.kind]}
        </span>

        <IconButton label={strings.remove(index + 1)} size="xs" onClick={onRemove}>
          <Icon icon={Trash2} size="xs" />
        </IconButton>
      </div>

      {voice.kind === 'tone' ? (
        <div className={styles.grid}>
          <Field label={strings.wave}>
            <Select.Root
              value={voice.wave}
              onValueChange={(wave) => onChange({ wave: wave as Wave })}
            >
              <Select.Trigger size="sm" fullWidth />

              <Select.Content>
                {WAVES.map((wave) => (
                  <Select.Item key={wave} value={wave}>
                    {strings.waves[wave]}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Field>

          <Field label={strings.note}>
            <Select.Root
              value={String(nearestNote(voice.frequency) ?? '')}
              onValueChange={(midi) =>
                onChange({ frequency: Number(midiToFrequency(Number(midi)).toFixed(2)) })
              }
            >
              <Select.Trigger size="sm" fullWidth placeholder="—" />

              <Select.Content>
                {NOTES.map((midi) => (
                  <Select.Item key={midi} value={String(midi)}>
                    {noteName(midi)} · {Math.round(midiToFrequency(midi))} {strings.hz}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Field>

          <Field label={strings.frequency}>
            <NumberInput
              size="sm"
              fullWidth
              min={60}
              max={4000}
              step={1}
              value={Math.round(voice.frequency)}
              suffix={strings.hz}
              onValueChange={(next) => next !== null && onChange({ frequency: next })}
            />
          </Field>

          <Field label={strings.glide}>
            <NumberInput
              size="sm"
              fullWidth
              min={60}
              max={4000}
              step={1}
              value={voice.glideTo === undefined ? null : Math.round(voice.glideTo)}
              placeholder={strings.noGlide}
              suffix={strings.hz}
              onValueChange={(next) => onChange({ glideTo: next === null ? undefined : next })}
            />
          </Field>
        </div>
      ) : (
        <div className={styles.grid}>
          <Field label={strings.filter}>
            <Select.Root
              value={voice.filter.type}
              onValueChange={(type) =>
                onChange({ filter: { ...voice.filter, type: type as BiquadFilterType } })
              }
            >
              <Select.Trigger size="sm" fullWidth />

              <Select.Content>
                {FILTERS.map((type) => (
                  <Select.Item key={type} value={type}>
                    {strings.filterTypes[type]}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Field>

          <Field label={strings.frequency}>
            <NumberInput
              size="sm"
              fullWidth
              min={100}
              max={8000}
              step={10}
              value={Math.round(voice.filter.frequency)}
              suffix={strings.hz}
              onValueChange={(next) =>
                next !== null && onChange({ filter: { ...voice.filter, frequency: next } })
              }
            />
          </Field>

          <Field label={strings.color}>
            <Select.Root
              value={voice.color ?? 'white'}
              onValueChange={(color) => onChange({ color: color as NoiseColor })}
            >
              <Select.Trigger size="sm" fullWidth />

              <Select.Content>
                {COLORS.map((color) => (
                  <Select.Item key={color} value={color}>
                    {strings.colors[color]}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Field>
        </div>
      )}

      <div className={styles.sliders}>
        <SliderField
          label={strings.gain}
          display={voice.gain.toFixed(2)}
          min={0}
          max={1}
          step={0.01}
          value={voice.gain}
          onChange={(gain) => onChange({ gain })}
        />

        <SliderField
          label={strings.delay}
          display={`${ms(voice.delay)} ${strings.ms}`}
          min={0}
          max={2500}
          step={5}
          value={ms(voice.delay)}
          onChange={(next) => onChange({ delay: seconds(next) })}
        />

        <SliderField
          label={strings.attack}
          display={`${ms(voice.envelope.attack)} ${strings.ms}`}
          min={1}
          max={200}
          step={1}
          value={ms(voice.envelope.attack)}
          onChange={(next) => onChange({ envelope: { ...voice.envelope, attack: seconds(next) } })}
        />

        <SliderField
          label={strings.decay}
          display={`${ms(voice.envelope.decay)} ${strings.ms}`}
          min={10}
          max={2000}
          step={5}
          value={ms(voice.envelope.decay)}
          onChange={(next) => onChange({ envelope: { ...voice.envelope, decay: seconds(next) } })}
        />
      </div>

      <details className={styles.motion}>
        <summary>{strings.motion}</summary>

        <div className={styles.sliders}>
          {voice.kind === 'tone' && (
            <>
              <Field label={strings.fmRatio}>
                <Select.Root
                  value={String(voice.fm?.ratio ?? 2)}
                  onValueChange={(ratio) =>
                    onChange({ fm: fmWith(voice.fm, { ratio: Number(ratio) }) })
                  }
                >
                  <Select.Trigger size="sm" fullWidth />

                  <Select.Content>
                    {FM_RATIOS.map((ratio) => (
                      <Select.Item key={ratio} value={String(ratio)}>
                        × {ratio}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Field>

              <SliderField
                label={strings.fmDepth}
                display={voice.fm?.depth ? voice.fm.depth.toFixed(1) : strings.off}
                min={0}
                max={8}
                step={0.1}
                value={voice.fm?.depth ?? 0}
                onChange={(depth) => onChange({ fm: fmWith(voice.fm, { depth }) })}
              />

              <SliderField
                label={strings.fmDepthEnd}
                display={(voice.fm?.depthEnd ?? voice.fm?.depth ?? 0).toFixed(1)}
                min={0}
                max={8}
                step={0.1}
                value={voice.fm?.depthEnd ?? voice.fm?.depth ?? 0}
                onChange={(depthEnd) => onChange({ fm: fmWith(voice.fm, { depthEnd }) })}
              />

              {drive}

              {lfoFields('vibrato', voice.vibrato, (next) => onChange({ vibrato: next }), {
                max: 100,
                step: 1,
                format: (value) => `${Math.round(value)} ${strings.cents}`,
              })}
            </>
          )}

          {tremolo}
          {filterWobble}

          {voice.kind === 'tone'
            ? voice.wave === 'pulse' && (
                <SliderField
                  label={strings.pulseWidth}
                  display={(voice.pulseWidth ?? 0.5).toFixed(2)}
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  value={voice.pulseWidth ?? 0.5}
                  onChange={(pulseWidth) => onChange({ pulseWidth })}
                />
              )
            : drive}
        </div>
      </details>
    </li>
  );
}

function fmWith(current: FmSpec | undefined, patch: Partial<FmSpec>): FmSpec {
  return { ratio: 2, depth: 0, ...current, ...patch };
}
