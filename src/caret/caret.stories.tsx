import type { Meta, StoryObj } from '@storybook/react-vite';

import { Caret, Inline, Text } from '@haunt/ui';

const meta = {
  title: 'Текст/Caret',
  component: Caret,
  tags: ['autodocs'],
  args: {
    shape: 'block',
  },
  decorators: [
    (Story) => (
      <Inline gap={1}>
        <Text mono tone="muted">
          &gt; печатает
        </Text>

        <Story />
      </Inline>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Мигающая каретка (TUI-акцент): пустое поле, «печатает…», конец строки состояния. Декоративная — скрыта от скринридера. Мигает и при `prefers-reduced-motion`: это маркер места, а не эффект.',
      },
    },
  },
} satisfies Meta<typeof Caret>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Block: Story = {};

export const Bar: Story = {
  args: { shape: 'bar' },
};
