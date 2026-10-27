import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { Badge, Heading, Stack, Surface, Text } from '@haunt/ui';
import { Tilt } from '@haunt/ui/fx';

import { movePointer } from '../story-pointer';

const meta = {
  title: 'Эффекты/Tilt',
  component: Tilt,
  tags: ['autodocs'],
  args: { max: 8, glare: true, scale: 1.02, radius: '2xl', perspective: 800 },
  argTypes: {
    max: { control: { type: 'range', min: 2, max: 20, step: 1 } },
    perspective: { control: { type: 'range', min: 300, max: 2000, step: 50 } },
  },
  render: (args) => (
    <Tilt {...args} style={{ width: 280 }}>
      <Surface level={3} p={5} radius="2xl" border>
        <Stack gap={2}>
          <Badge tone="accent">Сезон 3</Badge>
          <Heading level={3}>Пропуск «Ночная смена»</Heading>
          <Text size="sm" tone="muted">
            Наведите курсор — карточка наклонится за ним
          </Text>
        </Stack>
      </Surface>
    </Tilt>
  ),
  parameters: {
    docs: {
      description: {
        component:
          '3D-наклон карточки за курсором с бликом из `@haunt/ui/fx`. Слушает только мышь и перо: на тач наклона нет. Координаты пишутся переменными в rAF, движется только transform; обёртка стоит на месте и меряется — наклон не дрожит на краю. Возврат мягкий (`--ease-release`). Блик — `--fx-glow`. «Эффекты: без» и reduced-motion — плоская карточка.',
      },
    },
  },
} satisfies Meta<typeof Tilt>;

export default meta;

type Story = StoryObj<typeof meta>;

const surface = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[style*="--tilt-scale"]') as HTMLElement;

export const Default: Story = {
  name: 'Наклон за курсором',
  play: async ({ canvasElement }) => {
    const card = surface(canvasElement);
    const rect = card.getBoundingClientRect();

    movePointer(card, rect.right - 4, rect.top + 4);
    await waitFor(() => expect(card).toHaveAttribute('data-active'));
    await waitFor(() => expect(card.style.getPropertyValue('--tilt-ry')).not.toBe(''));
    // Курсор справа сверху — правый край уходит: поворот вокруг вертикали положительный
    await expect(Number.parseFloat(card.style.getPropertyValue('--tilt-ry'))).toBeGreaterThan(0);

    card.parentElement!.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    await waitFor(() => expect(card).not.toHaveAttribute('data-active'));
  },
};

export const Strong: Story = { name: 'Сильный наклон без блика', args: { max: 16, glare: false } };

export const TouchIgnored: Story = {
  name: 'Тач — без наклона',
  play: async ({ canvasElement }) => {
    const card = surface(canvasElement);
    const rect = card.getBoundingClientRect();

    movePointer(card, rect.left + 4, rect.top + 4, 'touch');
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(card).not.toHaveAttribute('data-active');
  },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — плоская',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    const card = surface(canvasElement);
    const rect = card.getBoundingClientRect();

    movePointer(card, rect.right - 4, rect.top + 4);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(card).not.toHaveAttribute('data-active');
    await expect(card.querySelector('[data-glare]')).toBeNull();
  },
};
