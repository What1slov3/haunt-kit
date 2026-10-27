import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Avatar, Inline, Stack, Surface, Text } from '@haunt/ui';
import { MarchingAnts } from '@haunt/ui/fx';

const meta = {
  title: 'Эффекты/MarchingAnts',
  component: MarchingAnts,
  tags: ['autodocs'],
  args: { active: true, radius: 'lg', offset: 3, dash: 5, gap: 4, strokeWidth: 1.5, speed: 450 },
  argTypes: {
    radius: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'] },
    offset: { control: { type: 'range', min: 0, max: 12, step: 1 } },
    speed: { control: { type: 'range', min: 150, max: 1500, step: 50 } },
  },
  render: (args) => (
    <MarchingAnts {...args} style={{ width: 320 }}>
      <Surface level={2} p={6} radius={args.radius} border>
        <Text tone="muted">Перетащите файлы сюда</Text>
      </Surface>
    </MarchingAnts>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Бегущий пунктир рамки из `@haunt/ui/fx` — выделение, зона броска. Рамка — SVG поверх, вынесена на `offset` и скруглена концентрично: радиус = `radius` содержимого + вынос (формула в CSS). Штрих подогнан под периметр — шва нет. Исключение из «только transform»: бежит `stroke-dashoffset` линии в 1–2 px. «Эффекты: без» и reduced-motion — рамка стоит.',
      },
    },
  },
} satisfies Meta<typeof MarchingAnts>;

export default meta;

type Story = StoryObj<typeof meta>;

const line = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('svg rect') as SVGRectElement;

export const DropZone: Story = {
  name: 'Зона броска',
  play: async ({ args, canvasElement }) => {
    const rect = line(canvasElement);
    const stroke = args.strokeWidth ?? 1.5;

    // radius lg (8) + вынос 3 − половина линии: рамка концентрична содержимому
    await expect(Number(rect.getAttribute('rx'))).toBeCloseTo(8 + 3 - stroke / 2, 1);
    await expect(getComputedStyle(rect).animationName).not.toBe('none');
  },
};

export const Selection: Story = {
  name: 'Выделение по клику',
  render: function SelectionStory(args) {
    const [selected, setSelected] = useState<string | null>('Мира');

    return (
      <Inline gap={4}>
        {['Мира', 'Тени', 'Лис'].map((name) => (
          <MarchingAnts
            key={name}
            {...args}
            radius="full"
            active={selected === name}
            onClick={() => setSelected(name)}
            style={{ display: 'inline-flex', cursor: 'pointer' }}
          >
            <Avatar name={name} size="lg" />
          </MarchingAnts>
        ))}
      </Inline>
    );
  },
};

export const Radii: Story = {
  name: 'Скругления',
  render: (args) => (
    <Stack gap={4} style={{ width: 280 }}>
      {(['none', 'md', '2xl'] as const).map((radius) => (
        <MarchingAnts key={radius} {...args} radius={radius}>
          <Surface level={2} p={4} radius={radius} border>
            <Text size="sm" mono tone="muted">
              radius={radius}
            </Text>
          </Surface>
        </MarchingAnts>
      ))}
    </Stack>
  ),
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — рамка стоит',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    await expect(line(canvasElement)).toBeInTheDocument();
    await expect(getComputedStyle(line(canvasElement)).animationName).toBe('none');
    await expect(within(canvasElement).getByText('Перетащите файлы сюда')).toBeVisible();
  },
};
