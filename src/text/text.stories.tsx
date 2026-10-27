import type { Meta, StoryObj } from '@storybook/react-vite';

import { Inline, Stack, Text } from '@haunt/ui';

const meta = {
  title: 'Текст/Text',
  component: Text,
  tags: ['autodocs'],
  args: {
    children: 'Съешь ещё этих мягких французских булок',
    size: 'md',
    weight: 'normal',
    tone: 'default',
  },
  argTypes: {
    as: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Строчный текст. Интерфейс — 13 px (`md`), сообщения — 14 px (`lg`). `mono` — для времени, счётчиков, id (TUI-акцент). `truncate` — одна строка с многоточием, `wrap` — перенос длинных слов и ссылок.',
      },
    },
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <Stack gap={1}>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <Text key={size} {...args} size={size}>
          {size} — {args.children}
        </Text>
      ))}
    </Stack>
  ),
};

export const Tones: Story = {
  render: (args) => (
    <Inline gap={3} wrap>
      {(
        ['default', 'muted', 'subtle', 'accent', 'success', 'warning', 'danger', 'info'] as const
      ).map((tone) => (
        <Text key={tone} {...args} tone={tone}>
          {tone}
        </Text>
      ))}
    </Inline>
  ),
};

export const Weights: Story = {
  render: (args) => (
    <Inline gap={3} wrap>
      {(['thin', 'normal', 'medium', 'semibold', 'bold'] as const).map((weight) => (
        <Text key={weight} {...args} weight={weight}>
          {weight}
        </Text>
      ))}
    </Inline>
  ),
};

export const Mono: Story = {
  args: { mono: true, tone: 'muted', children: '12:40 · #general · id 7f3a' },
};

/** Родитель ограничивает ширину — текст обрезается многоточием */
export const Truncate: Story = {
  args: {
    truncate: true,
    children: 'Очень длинная строка, которая обрежется многоточием, если не влезет в контейнер',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 240 }}>
        <Story />
      </div>
    ),
  ],
};

export const WrapLongLink: Story = {
  args: {
    wrap: true,
    size: 'lg',
    children:
      'Переносимый текст с длинной ссылкой https://haunt.app/spaces/very/long/path/that/would/otherwise/overflow/the/column',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 240 }}>
        <Story />
      </div>
    ),
  ],
};
