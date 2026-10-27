import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button, Grid, Stack, Text } from '@haunt/ui';
import { ImageTransition, type ImageTransitionProps } from '@haunt/ui/fx';

import { photos } from '../../lib/stories/demo-photos';

const scenes = [
  { src: photos.orb.src, alt: 'Светящийся шар над горизонтом' },
  { src: photos.ridge.src, alt: 'Горная гряда' },
  { src: photos.city.src, alt: 'Закат над городом' },
];

const effects = ['fade', 'focus', 'reveal', 'wipe'] as const;

/** Картинка, которая меняется по кнопке: переход идёт от прошлой к новой */
function Switcher(props: Omit<ImageTransitionProps, 'src' | 'alt'>) {
  const [index, setIndex] = useState(0);
  const scene = scenes[index % scenes.length]!;

  return (
    <Stack gap={2} align="start">
      <Button size="sm" onClick={() => setIndex((current) => current + 1)}>
        Сменить картинку
      </Button>

      <ImageTransition {...props} src={scene.src} alt={scene.alt} />
    </Stack>
  );
}

const meta = {
  title: 'Эффекты/ImageTransition',
  component: ImageTransition,
  tags: ['autodocs'],
  args: {
    src: scenes[0]!.src,
    alt: scenes[0]!.alt,
    effect: 'fade',
    duration: 900,
    aspectRatio: '16 / 9',
  },
  argTypes: {
    src: { control: false },
    effect: { control: 'inline-radio', options: effects },
    duration: { control: { type: 'range', min: 200, max: 3000, step: 100 } },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 960 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Смена картинки с мягким переходом из `@haunt/ui/fx`: `fade` — наплыв, новая картинка чуть крупнее и «садится» на место; `focus` — проявляется из размытия; `reveal` — расходится от центра мягким пятном, край размыт шумом; `wipe` — мягкая диагональная шторка. Для обложек, галерей, смены аватара или фона комнаты — `fade` по умолчанию, остальные — когда переход сам что-то говорит. Кадры идут в общем цикле `fx/scheduler`, маски грузятся через import() при первом переходе. `data-effects="off"`, `prefers-reduced-motion` и `data-fx-renderer="static"` — смена мгновенная.',
      },
    },
  },
} satisfies Meta<typeof ImageTransition>;

export default meta;

type Story = StoryObj<typeof meta>;

async function switchAndWait(canvasElement: HTMLElement) {
  const root = canvasElement.querySelector('[data-renderer]')!;

  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Сменить картинку' }));
  await waitFor(() => expect(root).toHaveAttribute('data-transitioning'));
  await waitFor(() => expect(root).not.toHaveAttribute('data-transitioning'), { timeout: 4000 });
  await expect(within(canvasElement).getByRole('img', { name: 'Горная гряда' })).toBeVisible();
}

export const Fade: Story = {
  name: 'Наплыв',
  render: (args) => <Switcher {...args} />,
  play: async ({ canvasElement }) => switchAndWait(canvasElement),
};

export const Focus: Story = {
  name: 'Из размытия',
  args: { effect: 'focus', duration: 1000 },
  render: (args) => <Switcher {...args} />,
};

export const Reveal: Story = {
  name: 'Пятно от центра',
  args: { effect: 'reveal', duration: 1200 },
  render: (args) => <Switcher {...args} />,
  play: async ({ canvasElement }) => switchAndWait(canvasElement),
};

export const Wipe: Story = {
  name: 'Мягкая шторка',
  args: { effect: 'wipe', duration: 1000 },
  render: (args) => <Switcher {...args} />,
};

/** Все переходы рядом — одна кнопка меняет все */
export const AllEffects: Story = {
  name: 'Все переходы',
  render: function AllEffectsStory(args) {
    const [index, setIndex] = useState(0);
    const scene = scenes[index % scenes.length]!;

    return (
      <Stack gap={2} align="start">
        <Button size="sm" onClick={() => setIndex((current) => current + 1)}>
          Сменить картинку
        </Button>

        <Grid columns={2} gap={3} style={{ width: '100%' }}>
          {effects.map((effect) => (
            <Stack key={effect} gap={1}>
              <ImageTransition {...args} effect={effect} src={scene.src} alt={scene.alt} />

              <Text size="sm" tone="muted" mono>
                {effect}
              </Text>
            </Stack>
          ))}
        </Grid>
      </Stack>
    );
  },
};

/** Без движения смена мгновенная: перехода нет вовсе, сразу новая картинка */
export const Instant: Story = {
  name: 'Эффекты выключены — мгновенно',
  globals: { effects: 'off' },
  render: (args) => <Switcher {...args} />,
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('[data-renderer]')!;

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Сменить картинку' }));

    await expect(root).not.toHaveAttribute('data-transitioning');
    await expect(within(canvasElement).getByRole('img', { name: 'Горная гряда' })).toBeVisible();
  },
};

/** `data-fx-renderer="static"` — тот же мгновенный путь, для отладки и снимков */
export const StaticPath: Story = {
  name: 'Путь static',
  decorators: [
    (Story) => (
      <div data-fx-renderer="static">
        <Story />
      </div>
    ),
  ],
  render: (args) => <Switcher {...args} />,
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('[data-renderer]')!;

    await expect(root).toHaveAttribute('data-renderer', 'static');
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Сменить картинку' }));
    await expect(root).not.toHaveAttribute('data-transitioning');
  },
};
