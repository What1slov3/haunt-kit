import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Button, Heading, Inline, Spacer } from '@haunt/ui';

const meta = {
  title: 'Раскладка/Spacer',
  component: Spacer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Распорка во флекс-ряду: забирает свободное место и разводит соседей по краям — заголовок слева, действия справа. Вместо `<span style="flex: 1" />` в каждом экране; для чтения с экрана её нет.',
      },
    },
  },
  render: () => (
    <Inline gap={2} align="center" style={{ width: 560 }}>
      <Heading level={3} size="md">
        Участники
      </Heading>

      <Spacer />

      <Button size="sm" variant="ghost">
        Фильтр
      </Button>

      <Button size="sm" variant="secondary">
        Пригласить
      </Button>
    </Inline>
  ),
} satisfies Meta<typeof Spacer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const row = canvasElement.firstElementChild as HTMLElement;
    const invite = within(canvasElement).getByRole('button', { name: 'Пригласить' });

    // Действия прижаты к правому краю ряда
    await expect(Math.round(row.getBoundingClientRect().right)).toBe(
      Math.round(invite.getBoundingClientRect().right),
    );
  },
};
