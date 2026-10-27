import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Headphones } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within, type Mock } from 'storybook/test';

import { Avatar, Button, Grid, Icon, Inline, StoreItemCard, Text } from '@haunt/ui';
import { randomMotif, seedFromText, sound, SoundDesigner, type SoundSpec } from '@haunt/ui/sound';

import { screen } from '../lib/stories/play-helpers';

const meta = {
  title: 'Эффекты/SoundDesigner',
  component: SoundDesigner,
  tags: ['autodocs'],
  args: { onValueChange: fn() },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Генератор звуков: класс — звук интерфейса (до 0,5 с) или мотив (до 3 с: награда, вход, событие). Собирать можно голосами — тон или шум, ноты пентатоники, огибающая, скольжение, фильтр, а под «Тембр и движение»: импульс с шириной, FM (множитель и индекс со спадом — колокол, металл), вибрато, тремоло, качание фильтра, перегруз, цвет шума — или шагами: сетка шестнадцатых, инструмент (колотушка, колокольчик, щипок, приставка, выдох), темп и звон. Помещение — импульсная характеристика по параметрам (хвост, пауза, яркость, ширина, доля), её форма видна под переключателем; эхо — повторы с затуханием и срезом верха. Форма волны с хвостом, «Послушать» / «Стоп» и правила набора: пик громкости ≤ 1, длина по классу, хвост эффектов, без писка в 2–4,5 кГц («Свести громкость» — пропорционально до 0.9). «Случайный» — в характере (вверх, вниз, звон, мягко): звук интерфейса — `randomSound`, мотив — сетка `randomSequence`. Результат — `SoundSpec` (`value` / `onValueChange`) для `sound.play(spec, { id, signal })`. Награда без интерфейса: `randomMotif(seedFromText(userId))` — у каждого свой мотив, всегда один и тот же. «Послушать» звучит и при выключенном уровне приложения: это явное действие.',
      },
    },
  },
} satisfies Meta<typeof SoundDesigner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Генератор',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/длина 0\.\d\d с/)).toBeInTheDocument();

    // Случайный мотив — новое значение наверх и сразу слышно
    await userEvent.click(canvas.getByRole('button', { name: 'Случайный' }));
    await expect(args.onValueChange).toHaveBeenCalledOnce();

    // Основа из набора: голоса меняются на голоса звука
    await userEvent.click(canvas.getAllByRole('combobox')[0]!);
    await userEvent.click(await screen().findByRole('option', { name: 'ring' }));
    await waitFor(() => expect(canvas.getAllByText(/^Голос \d+ · тон$/)).toHaveLength(8));
  },
};

const loud: SoundSpec = {
  minLevel: 'subtle',
  minInterval: 300,
  // Аккорд: три голоса разом — пик складывается
  voices: [440, 660, 880].map((frequency) => ({
    kind: 'tone' as const,
    wave: 'sine' as const,
    frequency,
    gain: 0.5,
    envelope: { attack: 0.005, decay: 0.12 },
  })),
};

export const Issues: Story = {
  name: 'Правила набора: громко — свести',
  args: { defaultValue: loud },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/Пик громкости больше 1/)).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Свести громкость' }));
    await waitFor(() => expect(canvas.queryByText(/Пик громкости больше 1/)).toBeNull());
    await expect(canvas.getByText(/громкость 0\.90/)).toBeInTheDocument();
  },
};

const people = ['Мария Орлова', 'Иван Лебедев', 'Аня', 'Лев'];

/** Мотив входа как награда: у каждого свой, из id — без интерфейса генератора */
function Rewards() {
  const [claimed, setClaimed] = useState<string | null>(null);

  return (
    <Grid columns={4} gap={3} style={{ width: 1040 }}>
      {people.map((name) => {
        const motif = randomMotif(seedFromText(`user:${name}`), 'up');

        return (
          <StoreItemCard
            key={name}
            name={`Мотив · ${name.split(' ')[0]}`}
            kind="звук входа"
            acquisition="earn"
            requirement="Провести три вечера в пространстве"
            progress={1}
            state={claimed === name ? 'owned' : 'available'}
            previewLabel="Свой мотив — только у тебя"
            onClaim={() => setClaimed(name)}
            preview={
              <Inline gap={2} align="center">
                <Avatar name={name} size="md" />

                <Button
                  size="sm"
                  variant="secondary"
                  iconStart={<Icon icon={Headphones} size="sm" />}
                  onClick={() => sound.play(motif, { id: `reward:${name}` })}
                >
                  Послушать
                </Button>
              </Inline>
            }
          />
        );
      })}
    </Grid>
  );
}

export const Reward: Story = {
  name: 'Награда: свой мотив у каждого',
  render: () => (
    <div>
      <Text tone="muted" size="sm" style={{ marginBottom: 12 }}>
        Мотив выводится из id человека: у каждого свой, и он не меняется.
      </Text>

      <Rewards />
    </div>
  ),
  play: async () => {
    // Зерно из текста — один и тот же мотив при каждом вызове
    await expect(randomMotif(seedFromText('user:Аня'))).toEqual(
      randomMotif(seedFromText('user:Аня')),
    );
  },
};

/** Последний звук, отданный наверх: `onValueChange` в историях — шпион `fn()` */
const lastValue = (onValueChange: unknown) =>
  (onValueChange as Mock<(spec: SoundSpec) => void>).mock.lastCall![0];

export const Steps: Story = {
  name: 'Мотив по шагам',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('radio', { name: 'мотив' }));
    await userEvent.click(canvas.getByRole('radio', { name: 'шаги' }));

    // Две ноты на одном шаге — аккорд; звук пересобирается из шагов и становится мотивом
    const press = async (name: string) => {
      const cell = canvas.getByRole('button', { name });

      if (cell.getAttribute('aria-pressed') !== 'true') await userEvent.click(cell);

      await expect(cell).toHaveAttribute('aria-pressed', 'true');
    };

    await press('Шаг 2 · E5');
    await press('Шаг 2 · G4');

    const motif = lastValue(args.onValueChange);

    await expect(motif.category).toBe('motif');
    await expect(motif.room).toBeDefined();

    // Лад — хроматика: в сетке появляются полутона. Выпадающие: основа и лад
    await userEvent.click(canvas.getAllByRole('combobox')[1]!);
    await userEvent.click(await screen().findByRole('option', { name: 'хроматика' }));
    await expect(await canvas.findByRole('button', { name: 'Шаг 1 · C♯4' })).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Случайный' }));
    // Случайный мотив — сетка целиком: ударов больше одного, класс прежний
    await expect(lastValue(args.onValueChange).category).toBe('motif');
    await expect(lastValue(args.onValueChange).voices.length).toBeGreaterThan(2);
  },
};

export const Effects: Story = {
  name: 'Помещение и эхо',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('switch', { name: 'Помещение' }));
    await expect(
      canvas.getByRole('img', { name: 'Импульсная характеристика помещения' }),
    ).toBeVisible();
    await expect(lastValue(args.onValueChange).room?.decay).toBeGreaterThan(0);

    await userEvent.click(canvas.getByRole('switch', { name: 'Эхо' }));
    await expect(canvas.getByText(/хвост \d\.\d\d с/)).toBeInTheDocument();
  },
};
