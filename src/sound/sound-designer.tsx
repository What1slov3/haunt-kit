import { useEffect, useRef, useState, type ComponentPropsWithRef } from 'react';

import { Dices, Play, Plus, Square } from 'lucide-react';

import { Button } from '../button/button';
import { Callout } from '../callout/callout';
import { CodeBlock } from '../code-block/code-block';
import { Field } from '../field/field';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { Select } from '../select/select';
import { Spacer } from '../spacer/spacer';
import { useUiStrings } from '../strings/ui-strings-context';
import { ToggleGroup } from '../toggle-group/toggle-group';

import {
  MOTIF_ROOM,
  randomSequence,
  sequenceSound,
  stepSeconds,
  type SequenceSpec,
} from './sequence';
import { sound } from './sound';
import {
  checkSound,
  DESIGN_LIMITS,
  normalizeGain,
  peakGain,
  randomSound,
  SOUND_MOODS,
  type SoundIssue,
  type SoundMood,
} from './sound-design';
import { drawPeaks } from './sound-designer-draw';
import { SoundEffects } from './sound-designer-effects';
import { StepEditor } from './sound-designer-steps';
import { VoiceCard, type VoicePatch } from './sound-designer-voice';
import styles from './sound-designer.module.css';
import {
  PENTATONIC,
  soundDuration,
  soundLength,
  SOUND_NAMES,
  SOUNDS,
  soundTail,
  type NoiseVoice,
  type SoundCategory,
  type SoundName,
  type SoundSpec,
  type ToneVoice,
  type Voice,
} from './sounds';

export interface SoundDesignerProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange'
> {
  /** Звук — описание данными, тот же `SoundSpec`, что играет `sound.play` */
  value?: SoundSpec;
  /** Начальный звук; по умолчанию — `success` из набора */
  defaultValue?: SoundSpec;
  onValueChange?: (spec: SoundSpec) => void;
  /** Начальное зерно «Случайного»: одно зерно — один звук (`randomSound`, `randomSequence`) */
  seed?: number;
}

type Mode = 'voices' | 'steps';

const CATEGORIES: readonly SoundCategory[] = ['ui', 'motif'];
const MODES: readonly Mode[] = ['voices', 'steps'];

const newTone = (): ToneVoice => ({
  kind: 'tone',
  wave: 'sine',
  frequency: PENTATONIC.D5,
  gain: 0.2,
  envelope: { attack: 0.005, decay: 0.1 },
});

const newNoise = (): NoiseVoice => ({
  kind: 'noise',
  gain: 0.06,
  envelope: { attack: 0.002, decay: 0.04 },
  filter: { type: 'bandpass', frequency: 1200, q: 0.7 },
});

/** Класс в звуке: ui — по умолчанию, поэтому поля нет совсем — JSON звука интерфейса не меняется */
function withCategory(spec: SoundSpec, category: SoundCategory): SoundSpec {
  if (category === 'motif') return { ...spec, category };

  const next = { ...spec };

  delete next.category;

  return next;
}

/** Форма волны звука с хвостом эффектов, нарисованная в OfflineAudioContext — видно, не включая динамики */
function Waveform({ spec, label }: { spec: SoundSpec; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    void import('./synth')
      .then(({ renderSound }) => renderSound(spec))
      .then((samples) => {
        if (!cancelled && ref.current) drawPeaks(ref.current, samples);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [spec]);

  return <canvas ref={ref} className={styles.waveform} role="img" aria-label={label} />;
}

interface Playback {
  controller: AbortController;
  timer: ReturnType<typeof setTimeout>;
  startedAt: number;
}

/**
 * Генератор звуков: класс (звук интерфейса до 0,5 с или мотив до 3 с), основа из набора, голоса с
 * огибающей, тембром (FM, импульс, перегруз) и движением (вибрато, тремоло, качание фильтра) или сетка
 * шагов с инструментом, помещение с импульсной характеристикой и эхо, форма волны и проверка правил
 * набора. «Случайный» собирает звук в характере по зерну (`randomSound` / `randomSequence`) — так же
 * экран может выдать человеку его собственный мотив наградой: зерно из id, мотив всегда один и тот же.
 * Результат — `SoundSpec` для `sound.play(spec, { id })`. Сам проигрывает звук и при выключенном уровне
 * приложения: «Послушать» — явное действие, контейнер ставит себе `data-sound="on"`.
 */
export function SoundDesigner({
  value: valueProp,
  defaultValue,
  onValueChange,
  seed: seedProp = 1,
  className,
  ...rest
}: SoundDesignerProps) {
  const strings = useUiStrings().soundDesigner;
  const rootRef = useRef<HTMLDivElement>(null);
  const playback = useRef<Playback | null>(null);
  const [inner, setInner] = useState<SoundSpec>(() => defaultValue ?? SOUNDS.success);
  const [preset, setPreset] = useState<SoundName | ''>(defaultValue ? '' : 'success');
  const [mood, setMood] = useState<SoundMood>('up');
  const [seed, setSeed] = useState(seedProp);
  const [mode, setMode] = useState<Mode>('voices');
  const [sequence, setSequence] = useState<SequenceSpec>(() => randomSequence(seedProp, 'up'));
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const spec = valueProp ?? inner;
  const category = spec.category ?? 'ui';
  const limits = DESIGN_LIMITS[category];
  const issues = checkSound(spec);
  const tail = soundTail(spec);

  // Ушли с экрана посреди мотива — он не доигрывает в пустоте
  useEffect(() => {
    const current = playback;

    return () => {
      current.current?.controller.abort();
      clearTimeout(current.current?.timer);
    };
  }, []);

  // Курсор по шагам, пока звучит мотив: шаг — от времени с начала проигрывания
  useEffect(() => {
    if (!playing || mode !== 'steps') return;

    const step = stepSeconds(sequence.bpm) * 1000;
    let frame = 0;

    const tick = () => {
      const started = playback.current?.startedAt;

      if (started === undefined) return;

      const index = Math.floor((performance.now() - started) / step);

      setPlayhead(index < sequence.steps.length ? index : null);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [playing, mode, sequence.bpm, sequence.steps.length]);

  const update = (next: SoundSpec) => {
    setInner(next);
    onValueChange?.(next);
  };

  const updateVoice = (index: number, patch: VoicePatch) => {
    update({
      ...spec,
      voices: spec.voices.map((voice, i) =>
        i === index ? ({ ...voice, ...patch } as Voice) : voice,
      ),
    });
    setPreset('');
  };

  const stopPlayback = () => {
    const current = playback.current;

    if (!current) return;

    current.controller.abort();
    clearTimeout(current.timer);
    playback.current = null;
    setPlaying(false);
  };

  const play = (next: SoundSpec = spec) => {
    stopPlayback();

    const controller = new AbortController();
    const result = sound.play(next, {
      element: rootRef.current,
      id: 'sound-designer',
      signal: controller.signal,
    });

    if (result !== 'played') return;

    const timer = setTimeout(
      () => {
        playback.current = null;
        setPlaying(false);
      },
      soundLength(next) * 1000 + 100,
    );

    playback.current = { controller, timer, startedAt: performance.now() };
    setPlaying(true);
  };

  const applySequence = (next: SequenceSpec) => {
    setSequence(next);
    setPreset('');

    const motif = sequenceSound(next, {
      minLevel: spec.minLevel,
      room: spec.room,
      echo: spec.echo,
    });

    update(motif);

    return motif;
  };

  const roll = () => {
    const nextSeed = seed + 1;

    setSeed(nextSeed);
    setPreset('');

    if (category === 'motif') {
      setMode('steps');
      // Тональность остаётся своей: случайна мелодия, а не лад, который выбрал человек
      play(applySequence(randomSequence(nextSeed, mood, sequence.scale)));

      return;
    }

    const next = randomSound(nextSeed, mood);

    setMode('voices');
    update(next);
    play(next);
  };

  const changeCategory = (next: SoundCategory) => {
    // Мотив без помещения звучит сухо и коротко — первое включение даёт ему зал по умолчанию
    const withRoom = next === 'motif' && !spec.room ? { ...spec, room: MOTIF_ROOM } : spec;

    update(withCategory(withRoom, next));
  };

  const issueText = (issue: SoundIssue) => {
    switch (issue.code) {
      case 'harsh':
        return strings.issues.harsh((issue.voice ?? 0) + 1);
      case 'voices':
        return strings.issues.voices(limits.maxVoices);
      case 'duration':
        return strings.issues.duration[category];
      case 'tail':
        return strings.issues.tail(String(limits.maxTail));
      default:
        return strings.issues[issue.code];
    }
  };

  return (
    <div ref={rootRef} className={cx(styles.root, className)} data-sound="on" {...rest}>
      <div className={styles.toolbar}>
        <Field label={strings.preset}>
          <Select.Root
            value={preset}
            onValueChange={(name) => {
              setPreset(name as SoundName);
              setMode('voices');
              update(SOUNDS[name as SoundName]);
            }}
          >
            <Select.Trigger size="sm" placeholder="—" />

            <Select.Content>
              {SOUND_NAMES.map((name) => (
                <Select.Item key={name} value={name}>
                  {name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Field>

        <Field label={strings.category}>
          <ToggleGroup.Root
            type="single"
            size="sm"
            value={category}
            aria-label={strings.category}
            onValueChange={(next) => next && changeCategory(next as SoundCategory)}
          >
            {CATEGORIES.map((option) => (
              <ToggleGroup.Item key={option} value={option}>
                {strings.categories[option]}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </Field>

        <Field label={strings.mood}>
          <ToggleGroup.Root
            type="single"
            size="sm"
            value={mood}
            aria-label={strings.mood}
            onValueChange={(next) => next && setMood(next as SoundMood)}
          >
            {SOUND_MOODS.map((option) => (
              <ToggleGroup.Item key={option} value={option}>
                {strings.moods[option]}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </Field>

        <Spacer />

        <Button
          size="sm"
          variant="secondary"
          iconStart={<Icon icon={Dices} size="sm" />}
          onClick={roll}
        >
          {strings.random}
        </Button>

        {playing ? (
          <Button
            size="sm"
            variant="accent"
            iconStart={<Icon icon={Square} size="sm" />}
            onClick={stopPlayback}
          >
            {strings.stop}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="accent"
            iconStart={<Icon icon={Play} size="sm" />}
            onClick={() => play()}
          >
            {strings.play}
          </Button>
        )}
      </div>

      <div className={styles.scope}>
        <Waveform spec={spec} label={strings.waveform} />

        <span className={styles.stats}>
          {strings.stats(
            soundDuration(spec).toFixed(2),
            tail > 0 ? tail.toFixed(2) : null,
            peakGain(spec).toFixed(2),
            spec.voices.length,
          )}
        </span>
      </div>

      {issues.length > 0 && (
        <Callout
          tone="warning"
          action={
            issues.some((issue) => issue.code === 'gain') && (
              <Button size="sm" variant="secondary" onClick={() => update(normalizeGain(spec))}>
                {strings.normalize}
              </Button>
            )
          }
        >
          <ul className={styles.issues}>
            {issues.map((issue, index) => (
              <li key={index}>{issueText(issue)}</li>
            ))}
          </ul>
        </Callout>
      )}

      <div className={styles.voicesHead}>
        <ToggleGroup.Root
          type="single"
          size="sm"
          value={mode}
          aria-label={strings.mode}
          onValueChange={(next) => next && setMode(next as Mode)}
        >
          {MODES.map((option) => (
            <ToggleGroup.Item key={option} value={option}>
              {strings.modes[option]}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>

        <Spacer />

        {mode === 'voices' && (
          <>
            <Button
              size="sm"
              variant="ghost"
              iconStart={<Icon icon={Plus} size="xs" />}
              onClick={() => update({ ...spec, voices: [...spec.voices, newTone()] })}
            >
              {strings.addTone}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              iconStart={<Icon icon={Plus} size="xs" />}
              onClick={() => update({ ...spec, voices: [...spec.voices, newNoise()] })}
            >
              {strings.addNoise}
            </Button>
          </>
        )}
      </div>

      {mode === 'voices' ? (
        <ol className={styles.voices} aria-label={strings.voices}>
          {spec.voices.map((voice, index) => (
            <VoiceCard
              key={index}
              voice={voice}
              index={index}
              onChange={(patch) => updateVoice(index, patch)}
              onRemove={() =>
                update({ ...spec, voices: spec.voices.filter((_, i) => i !== index) })
              }
            />
          ))}
        </ol>
      ) : (
        <StepEditor
          sequence={sequence}
          playhead={playing ? playhead : null}
          onChange={applySequence}
        />
      )}

      <SoundEffects spec={spec} onChange={(patch) => update({ ...spec, ...patch })} />

      <details className={styles.spec}>
        <summary>{strings.spec}</summary>

        <CodeBlock code={JSON.stringify(spec, null, 2)} language="json" copyable maxHeight={280} />
      </details>
    </div>
  );
}
