import type { Meta, StoryObj } from '@storybook/react-vite';

import { Text, TypingDots } from '@haunt/ui';

const meta = {
  title: 'Текст/TypingDots',
  component: TypingDots,
  tags: ['autodocs'],
  args: {
    size: 'md',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Три точки волной — индикатор «печатает…». Смысл несёт текст рядом, поэтому точки скрыты от скринридера. Волна гаснет при «эффекты: без» в тулбаре и при `prefers-reduced-motion`.',
      },
    },
  },
} satisfies Meta<typeof TypingDots>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Text tone="muted">
      <TypingDots {...args} />
    </Text>
  ),
};

export const WithText: Story = {
  args: { size: 'sm' },
  render: (args) => (
    <Text size="sm" tone="muted" mono>
      Мария печатает <TypingDots {...args} />
    </Text>
  ),
};
