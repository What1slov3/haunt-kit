import type { Meta, StoryObj } from '@storybook/react-vite';

import { Box, Text } from '@haunt/ui';

const demo = { background: 'var(--surface-2)', border: '1px solid var(--border)' };

const meta = {
  title: 'Раскладка/Box',
  component: Box,
  tags: ['autodocs'],
  args: {
    p: 3,
    radius: 'md',
    style: demo,
    children: <Text>Отступы и скругление из токенов</Text>,
  },
  argTypes: {
    children: { control: false },
    as: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Базовый контейнер: отступы `p`, `px`, `py`, `pt`… числом по шкале `--space-*` (полушаги `0.5` и `1.5`), скругление по шкале `--radius-*`. Остальное — через `className`. На нём построены `Stack`, `Inline`, `Grid`, `Surface`.',
      },
    },
  },
} satisfies Meta<typeof Box>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PaddingAxes: Story = {
  args: { p: undefined, px: 6, py: 1.5 },
};

export const RadiusFull: Story = {
  args: { px: 4, py: 1, radius: 'full' },
};

/** `as` меняет тег, пропсы остаются как у div */
export const AsSection: Story = {
  args: { as: 'section', 'aria-label': 'Секция', p: 4, radius: 'lg' },
};
