import type { Meta, StoryObj } from '@storybook/react-vite';

import { Inline, Skeleton, Stack } from '@haunt/ui';

const meta = {
  title: 'Отображение/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  args: { width: 200, height: 12, radius: 'sm' },
  argTypes: {
    width: { control: 'text' },
    height: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Заглушка на время загрузки. Перелив едет слева направо (только `transform`); при `data-effects="off"` и reduced-motion остаётся тихий пульс. `lines` — несколько строк текста, последняя короче.',
      },
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Circle: Story = {
  args: { circle: true, width: 32, height: undefined },
};

export const Lines: Story = {
  args: { lines: 3, height: 10, width: undefined },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export const ButtonShape: Story = {
  args: { width: 140, height: 28, radius: 'md' },
};

/** Сообщение в ленте, пока грузится история канала */
export const Message: Story = {
  render: () => (
    <Inline gap={2} align="start" style={{ maxWidth: 420 }}>
      <Skeleton circle width={32} />

      <Stack gap={1.5} grow>
        <Skeleton width="40%" height={12} />
        <Skeleton lines={2} height={10} />
      </Stack>
    </Inline>
  ),
};
