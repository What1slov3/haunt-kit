import type { Meta, StoryObj } from '@storybook/react-vite';

import { Heading, Stack } from '@haunt/ui';

const meta = {
  title: 'Текст/Heading',
  component: Heading,
  tags: ['autodocs'],
  args: {
    level: 2,
    children: 'Настройки пространства',
  },
  argTypes: {
    as: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Заголовок. `level` — семантика (тег `h1`–`h6`), `size` — визуальный размер отдельно. `marker` — моно-префикс `>` (гасится TUI в тулбаре), `overline` — моно-капитель для категорий в списках.',
      },
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Levels: Story = {
  render: (args) => (
    <Stack gap={2}>
      {([1, 2, 3, 4, 5, 6] as const).map((level) => (
        <Heading key={level} {...args} level={level}>
          h{level} — {args.children}
        </Heading>
      ))}
    </Stack>
  ),
};

export const Large: Story = {
  args: { level: 1, size: '4xl', children: 'Заголовок 4xl' },
};

/** Маркер `>` пропадает при «tui: выкл» в тулбаре */
export const Marker: Story = {
  args: { level: 3, marker: true, children: 'Заголовок с маркером' },
};

export const Overline: Story = {
  args: { level: 4, overline: true, children: 'Участники — 4' },
};

export const Tones: Story = {
  render: (args) => (
    <Stack gap={1}>
      {(['default', 'muted', 'subtle', 'accent'] as const).map((tone) => (
        <Heading key={tone} {...args} level={3} tone={tone}>
          {tone}
        </Heading>
      ))}
    </Stack>
  ),
};

export const Truncate: Story = {
  args: {
    truncate: true,
    children: 'Очень длинный заголовок канала, который не помещается в узкую шапку',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 260 }}>
        <Story />
      </div>
    ),
  ],
};
