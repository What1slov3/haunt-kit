import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hash } from 'lucide-react';

import { Badge, Box, Icon, Inline, Text } from '@haunt/ui';

const cell = { background: 'var(--surface-2)', border: '1px solid var(--border)' };

const meta = {
  title: 'Раскладка/Inline',
  component: Inline,
  tags: ['autodocs'],
  args: {
    gap: 2,
    children: (
      <>
        <Icon icon={Hash} size="sm" />

        <Text weight="semibold">general</Text>

        <Badge tone="accent" size="sm">
          12
        </Badge>
      </>
    ),
  },
  argTypes: {
    children: { control: false },
    as: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Горизонтальный ряд. По умолчанию центрирует по вертикали — как строка с иконкой и текстом. `wrap` переносит элементы, `justify="between"` разносит края.',
      },
    },
  },
} satisfies Meta<typeof Inline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const JustifyBetween: Story = {
  args: {
    justify: 'between',
    children: (
      <>
        <Text weight="semibold">Участники</Text>

        <Text size="sm" tone="muted" mono>
          4 в сети
        </Text>
      </>
    ),
  },
};

export const Wrap: Story = {
  args: {
    wrap: true,
    gap: 1,
    style: { maxWidth: 260 },
    children: (
      <>
        {['rust', 'design', 'voice', 'tauri', 'state', 'radix', 'motion', 'tokens'].map((tag) => (
          <Box key={tag} px={2} py={0.5} radius="full" style={cell}>
            <Text size="sm">{tag}</Text>
          </Box>
        ))}
      </>
    ),
  },
};

/** Длинный текст обрезается, если ему дать `grow` и `Text truncate` */
export const LongText: Story = {
  args: {
    style: { maxWidth: 240 },
    children: (
      <>
        <Icon icon={Hash} size="sm" />

        <Text truncate style={{ flex: 1, minWidth: 0 }}>
          rust-и-очень-длинное-название-канала-которое-не-влезает
        </Text>

        <Badge size="sm">3</Badge>
      </>
    ),
  },
};
