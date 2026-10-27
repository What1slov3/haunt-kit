import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { MemberSkeleton, MessageSkeleton } from '@haunt/ui';

const meta = {
  title: 'Сообщество/MessageSkeleton',
  component: MessageSkeleton,
  subcomponents: { MemberSkeleton },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 520 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Заглушки ленты и списка участников на `Skeleton`: та же сетка, что у настоящих строк, поэтому после загрузки ничего не сдвигается. Ширины псевдослучайны, но устойчивы по `seed` (`skeleton-rows.ts`). Перелив — у `Skeleton`, без эффектов — пульс. Для скринридера — `role="status"` с подписью.',
      },
    },
  },
} satisfies Meta<typeof MessageSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Messages: Story = {
  name: 'Лента',
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('Загрузка сообщений');
  },
};

export const WithAttachments: Story = { name: 'С вложениями', args: { attachments: 0.5, seed: 4 } };

export const Compact: Story = {
  name: 'Продолжения одного автора',
  args: { compact: true, count: 3 },
};

export const Members: Story = {
  name: 'MemberSkeleton',
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
  render: () => <MemberSkeleton heading count={6} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      'Загрузка участников',
    );
  },
};

export const MembersWithActivity: Story = {
  name: 'MemberSkeleton с активностью',
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
  render: () => <MemberSkeleton activity count={5} seed={3} />,
};
