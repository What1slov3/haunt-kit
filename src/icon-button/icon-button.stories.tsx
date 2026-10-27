import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Pencil, Pin, Plus, Search, Send, Trash2 } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Icon, IconButton, Inline } from '@haunt/ui';

const meta = {
  title: 'Кнопки/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  args: {
    label: 'Уведомления',
    variant: 'ghost',
    size: 'md',
    children: <Icon icon={Bell} />,
    onClick: fn(),
  },
  argTypes: {
    children: { control: false },
    asChild: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Иконочная кнопка; иконка — `<Icon />` в children. `label` обязателен: у кнопки нет текста, скринридер читает подпись отсюда. Для подсказки при наведении оберните в `Tooltip`.',
      },
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ghost: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Уведомления' });

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Variants: Story = {
  render: (args) => (
    <Inline gap={2}>
      <IconButton {...args} label="Уведомления" variant="secondary">
        <Icon icon={Bell} />
      </IconButton>

      <IconButton {...args} label="Поиск" variant="primary">
        <Icon icon={Search} />
      </IconButton>

      <IconButton {...args} label="Отправить" variant="accent">
        <Icon icon={Send} />
      </IconButton>

      <IconButton {...args} label="Удалить" variant="danger">
        <Icon icon={Trash2} />
      </IconButton>
    </Inline>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <Inline gap={2} align="center">
      <IconButton {...args} label="20 px" size="xs" variant="secondary">
        <Icon icon={Pencil} size="xs" />
      </IconButton>

      <IconButton {...args} label="24 px" size="sm" variant="secondary">
        <Icon icon={Pencil} size="sm" />
      </IconButton>

      <IconButton {...args} label="28 px" size="md" variant="secondary">
        <Icon icon={Pencil} />
      </IconButton>

      <IconButton {...args} label="32 px" size="lg" variant="secondary">
        <Icon icon={Pencil} />
      </IconButton>
    </Inline>
  ),
};

export const Circle: Story = {
  args: {
    label: 'Создать сообщество',
    variant: 'secondary',
    shape: 'circle',
    size: 'lg',
    children: <Icon icon={Plus} />,
  },
};

/** Подсвеченное состояние — например, включённый фильтр или закреп */
export const Active: Story = {
  args: { label: 'Закреплённые', active: true, children: <Icon icon={Pin} /> },
};

export const Loading: Story = {
  args: { label: 'Сохраняем', variant: 'secondary', loading: true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Сохраняем' });

    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
  },
};

export const Disabled: Story = {
  args: { label: 'Выключено', variant: 'secondary', disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Выключено' })).toBeDisabled();
  },
};
