import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Inline, Spinner, Text } from '@haunt/ui';

const meta = {
  title: 'Кнопки/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  args: {
    size: 'md',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Индикатор загрузки с `role="status"`. Крутится и при `prefers-reduced-motion`: иначе «грузится» неотличимо от «зависло». Встроен в `Button loading` и `IconButton loading`.',
      },
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status', { name: 'Загрузка' })).toBeVisible();
  },
};

export const Sizes: Story = {
  render: (args) => (
    <Inline gap={4}>
      <Spinner {...args} size="sm" />
      <Spinner {...args} size="md" />
      <Spinner {...args} size="lg" />
    </Inline>
  ),
};

export const WithText: Story = {
  args: { size: 'sm', label: 'Загружаем историю' },
  render: (args) => (
    <Inline gap={2}>
      <Spinner {...args} />

      <Text size="sm" tone="muted">
        Загружаем историю…
      </Text>
    </Inline>
  ),
};
