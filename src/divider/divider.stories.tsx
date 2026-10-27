import type { Meta, StoryObj } from '@storybook/react-vite';

import { Divider, Inline, Text } from '@haunt/ui';

const meta = {
  title: 'Отображение/Divider',
  component: Divider,
  tags: ['autodocs'],
  args: { orientation: 'horizontal', tone: 'default', align: 'center' },
  argTypes: { label: { control: 'text' } },
  parameters: {
    docs: {
      description: {
        component:
          'Разделитель. С подписью — моно-капитель посередине или слева: «сегодня», «новые сообщения» (`tone="accent"`), «участники — 4». Вертикальный — между кнопками в ряду.',
      },
    },
  },
} satisfies Meta<typeof Divider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { label: 'сегодня' },
};

export const NewMessages: Story = {
  args: { label: 'новые сообщения', tone: 'accent' },
};

export const LabelStart: Story = {
  args: { label: 'участники — 4', align: 'start' },
};

export const Vertical: Story = {
  render: (args) => (
    <Inline gap={2}>
      <Text>слева</Text>
      <Divider {...args} orientation="vertical" />
      <Text>справа</Text>
    </Inline>
  ),
};

export const LongLabel: Story = {
  args: { label: 'очень длинная подпись разделителя, которая занимает почти всю ширину колонки' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
};
