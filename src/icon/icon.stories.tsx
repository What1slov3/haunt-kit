import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Hash, Mic, Search, Send, Settings, Volume2 } from 'lucide-react';
import { expect, within } from 'storybook/test';

import { Icon, Inline, Stack, Text } from '@haunt/ui';

const icons = { Bell, Hash, Mic, Search, Send, Settings, Volume2 };

const meta = {
  title: 'Кнопки/Icon',
  component: Icon,
  tags: ['autodocs'],
  args: {
    icon: Bell,
    size: 'md',
  },
  argTypes: {
    icon: {
      options: Object.keys(icons),
      mapping: icons,
      control: 'select',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Иконка из `lucide-react` с одной толщиной штриха на всю систему. 12 / 14 / 16 / 20 / 24 px; `md` — для кнопок 28 px и строк списков. Без `label` — декоративная и скрыта от скринридера.',
      },
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <Inline gap={4} align="end">
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <Stack key={size} gap={1} align="center">
          <Icon {...args} size={size} />

          <Text size="xs" mono tone="subtle">
            {size}
          </Text>
        </Stack>
      ))}
    </Inline>
  ),
};

/** Цвет — от текста вокруг (currentColor) */
export const InheritsColor: Story = {
  render: (args) => (
    <Inline gap={3}>
      <Text tone="accent">
        <Icon {...args} />
      </Text>

      <Text tone="danger">
        <Icon {...args} />
      </Text>

      <Text tone="muted">
        <Icon {...args} />
      </Text>
    </Inline>
  ),
};

/** С подписью иконка читается скринридером как изображение */
export const Labelled: Story = {
  args: { icon: Volume2, label: 'Голосовой канал' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: 'Голосовой канал' })).toBeVisible();
  },
};
