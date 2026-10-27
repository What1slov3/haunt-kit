import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sparkles } from 'lucide-react';
import { expect, within } from 'storybook/test';

import { Button, Callout, Icon } from '@haunt/ui';

const meta = {
  title: 'Отображение/Callout',
  component: Callout,
  tags: ['autodocs'],
  args: {
    tone: 'info',
    title: 'Бета',
    children: 'Голосовые каналы пока тестируются, качество может плавать.',
  },
  argTypes: {
    title: { control: 'text' },
    children: { control: 'text' },
    icon: { control: false },
    action: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Встроенное сообщение: подсказка в настройках, предупреждение, баннер о состоянии. `warning` и `danger` — `role="alert"`, остальные — `role="status"`. `banner` — полоса во всю ширину над чатом.',
      },
    },
  },
} satisfies Meta<typeof Callout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Neutral: Story = {
  args: {
    tone: 'neutral',
    title: undefined,
    children: 'Канал виден только участникам роли @design.',
  },
};

export const Success: Story = {
  args: { tone: 'success', title: undefined, icon: false, children: 'Настройки сохранены.' },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    title: 'Нет соединения',
    children: 'Пробуем переподключиться…',
    action: (
      <Button size="sm" variant="secondary">
        Повторить
      </Button>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('Нет соединения');
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    title: undefined,
    children: 'Сообщение не отправлено: сервер вернул 500.',
  },
};

export const CustomIcon: Story = {
  args: {
    tone: 'neutral',
    title: 'Новое',
    icon: <Icon icon={Sparkles} size="md" />,
    children: 'Реакции теперь можно ставить с клавиатуры.',
  },
};

export const Banner: Story = {
  args: {
    tone: 'warning',
    banner: true,
    title: undefined,
    children: 'Баннер во всю ширину — над чатом, пока соединение восстанавливается.',
  },
};

export const LongText: Story = {
  args: {
    tone: 'danger',
    title: 'Не удалось загрузить историю канала за последние тридцать дней',
    children:
      'Сервер ответил ошибкой. Очень длинное описание, которое переносится на несколько строк и не ломает раскладку: иконка остаётся сверху, кнопка — справа. https://haunt.app/status/incidents/very/long/link',
    action: (
      <Button size="sm" variant="secondary">
        Повторить
      </Button>
    ),
  },
};
