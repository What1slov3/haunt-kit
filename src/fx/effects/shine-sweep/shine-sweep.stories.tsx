import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Badge, Heading, Stack, Surface, Text } from '@haunt/ui';
import { ShineSweep } from '@haunt/ui/fx';

const meta = {
  title: 'Эффекты/ShineSweep',
  component: ShineSweep,
  tags: ['autodocs'],
  args: { trigger: 'hover', duration: 900, every: 4000, radius: '2xl' },
  argTypes: {
    trigger: { control: 'inline-radio', options: ['hover', 'interval', 'mount'] },
    duration: { control: { type: 'range', min: 300, max: 2000, step: 100 } },
  },
  render: (args) => (
    <ShineSweep {...args} style={{ width: 280 }}>
      <Surface level={3} p={5} radius="2xl" border>
        <Stack gap={2}>
          <Badge tone="accent">Редкое</Badge>
          <Heading level={3}>Роль «Хранитель»</Heading>
          <Text size="sm" tone="muted">
            Открывается за 30 дней в пространстве
          </Text>
        </Stack>
      </Surface>
    </ShineSweep>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Блик, пробегающий по поверхности, из `@haunt/ui/fx` — редкие награды, «магазин». Наклонная полоса света едет только transform и обрезана скруглением `radius`. Цвет — свет прожектора темы (`--fx-spotlight-color`), сила — `--fx-shimmer`. Пробег на наведении, раз в `every` мс или один раз при появлении. «Эффекты: без» и reduced-motion — без блика.',
      },
    },
  },
} satisfies Meta<typeof ShineSweep>;

export default meta;

type Story = StoryObj<typeof meta>;

const root = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[data-trigger]') as HTMLElement;

export const OnHover: Story = {
  name: 'На наведении',
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-sweeping]')).toBeNull();
    await userEvent.hover(root(canvasElement));
    await waitFor(() => expect(canvasElement.querySelector('[data-sweeping]')).not.toBeNull());
  },
};

export const Interval: Story = { name: 'По таймеру', args: { trigger: 'interval', every: 2500 } };

export const OnMount: Story = {
  name: 'Один раз при появлении',
  args: { trigger: 'mount' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-sweeping]')).not.toBeNull();
  },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — без блика',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    await userEvent.hover(root(canvasElement));
    await expect(canvasElement.querySelector('[data-sweeping]')).toBeNull();
  },
};
