import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { Heading, Stack, Surface, Text } from '@haunt/ui';
import { Noise } from '@haunt/ui/fx';

const meta = {
  title: 'Эффекты/Noise',
  component: Noise,
  tags: ['autodocs'],
  args: { opacity: 0.12, fps: 24, grain: 1, blend: 'overlay' },
  argTypes: {
    blend: { control: 'inline-radio', options: ['overlay', 'soft-light', 'normal'] },
    opacity: { control: { type: 'range', min: 0, max: 0.5, step: 0.01 } },
    fps: { control: { type: 'range', min: 6, max: 60, step: 1 } },
    grain: { control: { type: 'range', min: 1, max: 4, step: 1 } },
  },
  render: (args) => (
    <Surface
      level={3}
      p={6}
      radius="2xl"
      border
      style={{ position: 'relative', width: 340, background: 'var(--accent-soft)' }}
    >
      <Noise {...args} />

      <Stack gap={1}>
        <Heading level={3}>Ночной эфир</Heading>
        <Text size="sm" tone="muted">
          Зерно живёт поверх карточки и не мешает тексту
        </Text>
      </Stack>
    </Surface>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Живое зерно слоем из `@haunt/ui/fx`: одна шумовая плитка 128 px (`noise-tile.ts`, лениво), которая каждый кадр ложится со случайным сдвигом. Холст в разрешении зерна, растянут без сглаживания; кадры — общий цикл `fx/scheduler` с потолком `fps`, вне экрана стоят. Сила — `opacity × --fx-grain`. Скрыт от скринридера и мыши. «Эффекты: без» — без зерна (как `data-grain`), reduced-motion — зерно стоит.',
      },
    },
  },
} satisfies Meta<typeof Noise>;

export default meta;

type Story = StoryObj<typeof meta>;

const layer = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('canvas[data-noise]') as HTMLCanvasElement;

export const Default: Story = {
  name: 'Зерно поверх карточки',
  play: async ({ canvasElement }) => {
    await expect(layer(canvasElement)).toHaveAttribute('data-noise', 'live');
    await expect(layer(canvasElement)).toHaveAttribute('aria-hidden', 'true');
    // Холст получил размер карточки — первый кадр нарисован
    await waitFor(() => expect(layer(canvasElement).width).toBeGreaterThan(300));
  },
};

export const Coarse: Story = {
  name: 'Крупное, медленное',
  args: { grain: 3, fps: 12, opacity: 0.2 },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — без зерна',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    await expect(layer(canvasElement)).toHaveAttribute('data-noise', 'off');
    await expect(getComputedStyle(layer(canvasElement)).opacity).toBe('0');
  },
};
