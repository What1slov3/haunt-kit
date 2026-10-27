import { useEffect, useRef, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button, Grid, Inline, Stack, Text, ToggleGroup } from '@haunt/ui';
import {
  loadSynth,
  sound,
  SOUND_LEVELS,
  SOUND_NAMES,
  SOUNDS,
  SoundSlot,
  useSound,
  type PlayEvent,
  type SoundLevel,
  type SoundName,
} from '@haunt/ui/sound';

/** Форма волны звука, нарисованная в OfflineAudioContext — видно, не включая динамики */
function Waveform({ name }: { name: SoundName }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    void loadSynth()
      .then(({ renderSound }) => renderSound(SOUNDS[name]))
      .then((samples) => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');

        if (cancelled || !canvas || !ctx) return;

        const { width, height } = canvas;
        const style = getComputedStyle(canvas);
        let peak = 0;

        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = style.getPropertyValue('--accent').trim() || 'currentColor';
        ctx.beginPath();

        for (let x = 0; x < width; x++) {
          const from = Math.floor((x / width) * samples.length);
          const to = Math.floor(((x + 1) / width) * samples.length);
          let max = 0;

          for (let i = from; i < to; i++) max = Math.max(max, Math.abs(samples[i]!));

          peak = Math.max(peak, max);
          ctx.moveTo(x + 0.5, height / 2 - max * height * 0.48);
          ctx.lineTo(x + 0.5, height / 2 + max * height * 0.48);
        }

        ctx.stroke();
        canvas.dataset.peak = peak.toFixed(3);
        canvas.dataset.duration = (samples.length / 22050).toFixed(3);
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <canvas
      ref={ref}
      width={160}
      height={36}
      data-waveform={name}
      style={{ width: 160, height: 36 }}
    />
  );
}

/** Пульт: уровень на своём контейнере (`data-sound`), кнопка на каждый звук и журнал решений */
function Console() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState<SoundLevel>('on');
  const [log, setLog] = useState<PlayEvent[]>([]);
  const play = useSound(rootRef);

  useEffect(
    () => sound.onPlay((event) => setLog((current) => [event, ...current].slice(0, 6))),
    [],
  );

  return (
    <Stack ref={rootRef} gap={4} data-sound={level} style={{ maxWidth: 760 }}>
      <Inline gap={3} align="center">
        <Text size="sm" tone="muted">
          data-sound
        </Text>

        <ToggleGroup.Root
          type="single"
          size="sm"
          value={level}
          aria-label="Уровень звука"
          onValueChange={(value) => value && setLevel(value as SoundLevel)}
        >
          {SOUND_LEVELS.map((value) => (
            <ToggleGroup.Item key={value} value={value}>
              {value}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </Inline>

      <Grid columns={2} gap={2}>
        {SOUND_NAMES.map((name) => (
          <Inline key={name} gap={3} align="center">
            <Button size="sm" variant="secondary" onClick={() => play(name)} style={{ width: 120 }}>
              {name}
            </Button>

            <Waveform name={name} />

            <Text size="xs" tone="muted" mono>
              {SOUNDS[name].minLevel === 'on' ? 'on' : 'subtle, on'}
            </Text>
          </Inline>
        ))}
      </Grid>

      <Stack gap={1} aria-label="Журнал" role="log">
        {log.map((event, i) => (
          <Text key={i} size="xs" mono tone={event.result === 'played' ? 'default' : 'muted'}>
            {event.name} · {event.level} → {event.result}
          </Text>
        ))}
      </Stack>
    </Stack>
  );
}

const meta = {
  title: 'Эффекты/Звук',
  tags: ['autodocs'],
  render: () => <Console />,
  parameters: {
    docs: {
      description: {
        component:
          '`@haunt/ui/sound` — синтезированные звуки интерфейса на Web Audio, без файлов: `click`, `hover`, `send`, `mention`, `voice-join`, `voice-leave`, `error`, `success`. Уровень — `data-sound="off | subtle | on"` на `<html>` или контейнере (по умолчанию `off`): `subtle` тише и без щелчков и наведения. `sound.play(name, { element, volume })`, хук `useSound(ref)`, обёртка `SoundSlot press hover focus`. AudioContext — лениво и только после жеста; частые повторы прореживаются, громкость ограничена лимитером. Reduced-motion звук не трогает. Кит сам ничего не озвучивает — это решение приложения. В пульте уровень стоит на контейнере; форма волны у кнопки нарисована в OfflineAudioContext.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Panel: Story = {
  name: 'Пульт',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Граф каждого звука собран и отрисован: не тишина, без клиппинга, короткий
    await waitFor(
      () =>
        expect(canvasElement.querySelectorAll('[data-waveform][data-peak]')).toHaveLength(
          SOUND_NAMES.length,
        ),
      { timeout: 5000 },
    );

    for (const wave of canvasElement.querySelectorAll<HTMLCanvasElement>('[data-waveform]')) {
      const peak = Number(wave.dataset.peak);

      await expect(peak).toBeGreaterThan(0.01);
      await expect(peak).toBeLessThanOrEqual(1);
      await expect(Number(wave.dataset.duration)).toBeLessThan(0.6);
    }

    // Решения: off — тишина; on — звук играет либо ждёт жеста (синтетический клик жестом не считается)
    const events: PlayEvent[] = [];
    const stop = sound.onPlay((event) => events.push(event));

    await userEvent.click(canvas.getByRole('radio', { name: 'off' }));
    await userEvent.click(canvas.getByRole('button', { name: 'send' }));
    await userEvent.click(canvas.getByRole('radio', { name: 'subtle' }));
    await userEvent.click(canvas.getByRole('button', { name: 'click' }));
    await userEvent.click(canvas.getByRole('radio', { name: 'on' }));
    await userEvent.click(canvas.getByRole('button', { name: 'mention' }));
    stop();

    await expect(events.map((event) => `${event.name}:${event.result}`).slice(0, 2)).toEqual([
      'send:off',
      'click:quiet',
    ]);
    await expect(['played', 'no-gesture']).toContain(events[2]!.result);
  },
};

/** Кнопка со своим счётчиком: SoundSlot добавляет звук, не отнимая её onClick */
function SlotDemo() {
  const [count, setCount] = useState(0);

  return (
    <Stack gap={2} align="start" data-sound="on">
      <SoundSlot press="send" hover="hover">
        <Button onClick={() => setCount((value) => value + 1)}>Отправить · {count}</Button>
      </SoundSlot>
    </Stack>
  );
}

/** `SoundSlot` озвучивает чужую кнопку, не меняя её: нажатие и наведение, обработчики кнопки целы */
export const Slot: Story = {
  name: 'SoundSlot',
  render: () => <SlotDemo />,
  play: async ({ canvasElement }) => {
    const events: PlayEvent[] = [];
    const stop = sound.onPlay((event) => events.push(event));

    await userEvent.click(within(canvasElement).getByRole('button'));
    stop();

    await expect(within(canvasElement).getByRole('button')).toHaveTextContent('Отправить · 1');
    await expect(events.some((event) => event.name === 'send')).toBe(true);
  },
};
