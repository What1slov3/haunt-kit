import type { Meta, StoryObj } from '@storybook/react-vite';

import { Kbd, Text } from '@haunt/ui';

const meta = {
  title: 'Текст/Kbd',
  component: Kbd,
  tags: ['autodocs'],
  args: {
    children: 'Ctrl+K',
    size: 'md',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Клавиша или сочетание в моно с тонкой рамкой — как подсказка в TUI. Встроено в шорткаты меню и подсказок.',
      },
    },
  },
} satisfies Meta<typeof Kbd>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'sm', children: 'Esc' },
};

export const InText: Story = {
  render: (args) => (
    <Text size="sm" tone="muted">
      Поиск <Kbd {...args}>Ctrl</Kbd> <Kbd {...args}>K</Kbd>, закрыть <Kbd {...args}>Esc</Kbd>
    </Text>
  ),
};
