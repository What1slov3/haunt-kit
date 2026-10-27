import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge, Inline, type BadgeTone } from '@haunt/ui';

const tones: BadgeTone[] = ['neutral', 'accent', 'success', 'warning', 'danger', 'info'];

const meta = {
  title: 'Отображение/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'бета', tone: 'neutral', variant: 'soft', size: 'md' },
  argTypes: { children: { control: 'text' } },
  parameters: {
    docs: {
      description: {
        component:
          'Маленькая таблетка: статус, счётчик, «+33 %». `soft` — полупрозрачный фон и яркий текст, `solid` — заливка (счётчики), `outline` — рамка. `bracket` — TUI-вариант `[beta]`, скобки гасятся `data-tui="off"`.',
      },
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tones: Story = {
  render: (args) => (
    <Inline gap={2} wrap>
      {tones.map((tone) => (
        <Badge key={tone} {...args} tone={tone}>
          {tone}
        </Badge>
      ))}
    </Inline>
  ),
};

export const Solid: Story = {
  render: (args) => (
    <Inline gap={2} wrap>
      {tones.map((tone) => (
        <Badge key={tone} {...args} tone={tone} variant="solid">
          12
        </Badge>
      ))}
    </Inline>
  ),
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'outline' },
};

export const Small: Story = {
  args: { size: 'sm', variant: 'solid', tone: 'danger', children: '3' },
};

export const WithDot: Story = {
  args: { tone: 'success', dot: true, children: 'в сети' },
};

export const Bracket: Story = {
  render: (args) => (
    <Inline gap={2}>
      <Badge {...args} tone="info" bracket>
        beta
      </Badge>

      <Badge {...args} tone="accent" bracket>
        owner
      </Badge>
    </Inline>
  ),
};

export const Trend: Story = {
  render: (args) => (
    <Inline gap={2}>
      <Badge {...args} tone="success">
        +33 %
      </Badge>

      <Badge {...args} tone="warning">
        −22 %
      </Badge>
    </Inline>
  ),
};

export const LongText: Story = {
  args: { children: 'очень длинный бейдж, который не стоит так писать' },
};
