import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button, Inline } from '@haunt/ui';
import { Burst, type BurstProps } from '@haunt/ui/fx';

/** Кнопка с всплеском внутри: Burst кладётся в элемент с position: relative и стреляет по счётчику */
function Like(props: Omit<BurstProps, 'fire'>) {
  const [likes, setLikes] = useState(0);

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Button variant="secondary" count={likes} onClick={() => setLikes((count) => count + 1)}>
        Нравится
      </Button>

      <Burst {...props} fire={likes} />
    </span>
  );
}

const meta = {
  title: 'Эффекты/Burst',
  component: Burst,
  tags: ['autodocs'],
  args: { fire: 0, count: 8, distance: 30, spread: 360, size: 4, shape: 'dot', duration: 640 },
  argTypes: {
    fire: { control: false },
    shape: { control: 'inline-radio', options: ['dot', 'spark', 'rect'] },
    count: { control: { type: 'range', min: 3, max: 32, step: 1 } },
    distance: { control: { type: 'range', min: 10, max: 120, step: 5 } },
    spread: { control: { type: 'range', min: 30, max: 360, step: 10 } },
  },
  render: ({ fire: _fire, ...args }) => (
    <Inline gap={4} style={{ padding: 48 }}>
      <Like {...args} />
    </Inline>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Всплеск частиц из точки из `@haunt/ui/fx` — общий вариант всплеска `Chip`. Кладётся внутрь элемента с `position: relative` и стреляет при смене `fire` (счётчик, ключ); значение при монтировании не стреляет. Холст живёт только во время всплеска, кадры — общий цикл `fx/scheduler`, траектории — формулой (`particles.ts`, грузится лениво). Сила — `--fx-burst`. «Эффекты: без» и reduced-motion — без всплеска.',
      },
    },
  },
} satisfies Meta<typeof Burst>;

export default meta;

type Story = StoryObj<typeof meta>;

const layer = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[style*="--particle-reach"]') as HTMLElement;

export const Default: Story = {
  name: 'Всплеск по нажатию',
  play: async ({ canvasElement }) => {
    await expect(layer(canvasElement).querySelector('canvas')).toBeNull();
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Нравится/ }));
    await waitFor(() => expect(layer(canvasElement).querySelector('canvas')).not.toBeNull());
    // Отжили — холст снят
    await waitFor(() => expect(layer(canvasElement).querySelector('canvas')).toBeNull(), {
      timeout: 3000,
    });
  },
};

export const Sparks: Story = {
  name: 'Искры веером',
  args: { shape: 'spark', count: 14, distance: 56, spread: 120, size: 5 },
};

export const Wide: Story = {
  name: 'Крупный',
  args: { count: 18, distance: 80, size: 6, duration: 900 },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — без всплеска',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Нравится/ }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(layer(canvasElement).querySelector('canvas')).toBeNull();
  },
};
