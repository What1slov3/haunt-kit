import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { UnreadDivider } from '@haunt/ui';

const meta = {
  title: 'Сообщество/UnreadDivider',
  component: UnreadDivider,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 560 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Граница непрочитанного в ленте: линия цвета тревоги (`--danger`) и метка `Badge` у правого края — «Новые» или со счётчиком «5 новых». Скринридер слышит полную подпись разделителя: «5 новых сообщений». Разделитель дня — `DateDivider`.',
      },
    },
  },
} satisfies Meta<typeof UnreadDivider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('separator')).toHaveAccessibleName(
      'Новые сообщения',
    );
  },
};

export const WithCount: Story = {
  name: 'Со счётчиком',
  args: { count: 5 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('separator')).toHaveAccessibleName('5 новых сообщений');
    await expect(canvas.getByText('5 новых')).toBeVisible();
  },
};

export const One: Story = { name: 'Одно', args: { count: 1 } };
