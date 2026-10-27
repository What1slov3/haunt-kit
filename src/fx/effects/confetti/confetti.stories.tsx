import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Badge, Button, Stack, Surface, Text } from '@haunt/ui';
import { Confetti, type ConfettiProps } from '@haunt/ui/fx';

/** Карточка уровня: залп вылетает из неё и падает рядом, а не по всему экрану */
function LevelUp(props: Omit<ConfettiProps, 'fire'>) {
  const [level, setLevel] = useState(4);

  return (
    <Stack gap={3} align="center" style={{ padding: '120px 160px 40px' }}>
      <Surface level={3} p={4} radius="2xl" border style={{ position: 'relative' }}>
        <Stack gap={1} align="center">
          <Badge tone="accent">Уровень {level}</Badge>
          <Text size="sm" tone="muted">
            Голос пространства
          </Text>
        </Stack>

        <Confetti {...props} fire={level > 4 ? level : 0} />
      </Surface>

      <Button size="sm" onClick={() => setLevel((current) => current + 1)}>
        Повысить уровень
      </Button>
    </Stack>
  );
}

const meta = {
  title: 'Эффекты/Confetti',
  component: Confetti,
  tags: ['autodocs'],
  args: { fire: 0, count: 36, power: 110, spread: 70, duration: 1500, reach: 140 },
  argTypes: {
    fire: { control: false },
    count: { control: { type: 'range', min: 8, max: 120, step: 4 } },
    power: { control: { type: 'range', min: 40, max: 240, step: 10 } },
    spread: { control: { type: 'range', min: 10, max: 180, step: 5 } },
    reach: { control: { type: 'range', min: 40, max: 300, step: 10 } },
  },
  render: ({ fire: _fire, ...args }) => <LevelUp {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'Конфетти из элемента, не на весь экран, из `@haunt/ui/fx`: залп вверх конусом, бумажки кувыркаются и падают в пределах `reach` вокруг родителя (`position: relative`). Цвета — акцент, второй акцент и статусы. Холст только на время залпа, общий цикл кадров; траектории с сопротивлением и гравитацией — формулой. «Эффекты: без» и reduced-motion — без залпа.',
      },
    },
  },
} satisfies Meta<typeof Confetti>;

export default meta;

type Story = StoryObj<typeof meta>;

const layer = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[style*="--particle-reach"]') as HTMLElement;

export const LevelUpStory: Story = {
  name: 'Повышение уровня',
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Повысить уровень' }));
    await waitFor(() => expect(layer(canvasElement).querySelector('canvas')).not.toBeNull());
    await expect(within(canvasElement).getByText('Уровень 5')).toBeInTheDocument();
  },
};

export const Dense: Story = { name: 'Плотный залп', args: { count: 90, power: 160, spread: 100 } };

export const EffectsOff: Story = {
  name: 'Эффекты выключены — без залпа',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Повысить уровень' }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(layer(canvasElement).querySelector('canvas')).toBeNull();
    await expect(within(canvasElement).getByText('Уровень 5')).toBeInTheDocument();
  },
};
