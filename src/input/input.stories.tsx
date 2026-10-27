import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search, X } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { Icon, IconButton, Inline, Input, Kbd } from '@haunt/ui';

const meta = {
  title: 'Поля/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Написать сообщение',
    size: 'md',
    'aria-label': 'Поле',
  },
  argTypes: {
    startSlot: { control: false },
    endSlot: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Однострочное поле. Рамка и фокус — на обёртке (стили field-frame, `:focus-within`), поэтому слоты лежат внутри поля. 24 / 28 / 32 px, кегль как у кнопки того же размера.',
      },
    },
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox');

    await userEvent.type(input, 'Привет');

    await expect(input).toHaveValue('Привет');
  },
};

export const Sizes: Story = {
  render: (args) => (
    <Inline gap={2} align="center" wrap>
      <Input {...args} size="sm" placeholder="sm 24" />
      <Input {...args} size="md" placeholder="md 28" />
      <Input {...args} size="lg" placeholder="lg 32" />
    </Inline>
  ),
};

export const WithSlots: Story = {
  args: {
    placeholder: 'Поиск',
    startSlot: <Icon icon={Search} size="sm" />,
    endSlot: <Kbd size="sm">Ctrl+K</Kbd>,
    fullWidth: true,
  },
};

export const Clearable: Story = {
  args: {
    defaultValue: 'котики',
    fullWidth: true,
    startSlot: <Icon icon={Search} size="sm" />,
    endSlot: (
      <IconButton label="Очистить" size="xs">
        <Icon icon={X} size="xs" />
      </IconButton>
    ),
  },
};

export const Mono: Story = {
  args: { mono: true, defaultValue: 'hnt_7f3a9c', fullWidth: true },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: 'не то' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('textbox')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Выключено' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('textbox')).toBeDisabled();
  },
};

export const LongValue: Story = {
  args: {
    defaultValue:
      'https://haunt.app/spaces/very/long/path/that/would/otherwise/overflow/the/column/and/more',
    fullWidth: true,
  },
};

/** Приглашение командной строки: `>` из TUI-токена, в фокусе — цвет акцента; строка — свой знак */
export const Prompt: Story = {
  render: (args) => (
    <Inline gap={2}>
      <Input {...args} prompt placeholder="команда или канал" mono />

      <Input {...args} prompt="/" placeholder="giphy котики" />

      <Input {...args} prompt="#" placeholder="название-канала" />
    </Inline>
  ),
};
