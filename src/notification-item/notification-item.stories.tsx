import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bot, ShieldCheck } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Avatar, Button, Icon, NotificationItem } from '@haunt/ui';

const minutesAgo = (minutes: number) => Date.now() - minutes * 60_000;

const meta = {
  title: 'Списки/NotificationItem',
  component: NotificationItem,
  tags: ['autodocs'],
  args: {
    icon: <Avatar name="Мария Орлова" size="sm" />,
    title: 'Мария Орлова упомянула вас в #дизайн',
    children: '@vagner посмотри новый порядок каналов — перетаскиванием стало удобнее',
    time: minutesAgo(5),
    onClick: fn(),
    onMarkRead: fn(),
  },
  argTypes: {
    icon: { control: false },
    actions: { control: false },
    time: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 380 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Уведомление: аватар или иконка источника, заголовок, текст (до двух строк), `Timestamp`, действия. Непрочитанное — точка цвета акцента и жирный заголовок, кнопка «отметить прочитанным» (`onMarkRead`) — при наведении и фокусе. Кликабельна вся строка (`onClick`), но кнопкой служит заголовок: действия внутри — свои кнопки и клик строки не вызывают.',
      },
    },
  },
} satisfies Meta<typeof NotificationItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Read: Story = {
  name: 'Прочитанное',
};

export const Unread: Story = {
  name: 'Непрочитанное',
  args: { unread: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const article = canvas.getByRole('article');

    await expect(article).toHaveAccessibleName(/^Непрочитанное: Мария Орлова/);

    await userEvent.click(canvas.getByRole('button', { name: /Мария Орлова упомянула/ }));
    await expect(args.onClick).toHaveBeenCalledOnce();

    await userEvent.hover(article);
    await userEvent.click(canvas.getByRole('button', { name: 'Отметить прочитанным' }));
    await expect(args.onMarkRead).toHaveBeenCalledOnce();
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Invite: Story = {
  name: 'С действиями: приглашение',
  args: {
    unread: true,
    icon: <Avatar name="Котики" shape="rounded" size="sm" />,
    title: 'Приглашение в «Котики»',
    children: 'Иван Лебедев зовёт вас в пространство — 128 участников',
    time: minutesAgo(90),
    actions: (
      <>
        <Button size="sm" variant="accent">
          Принять
        </Button>

        <Button size="sm" variant="secondary">
          Отклонить
        </Button>
      </>
    ),
  },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Принять' }));
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const System: Story = {
  name: 'Системное: иконка вместо аватара',
  args: {
    icon: <Icon icon={ShieldCheck} size="lg" />,
    title: 'Вам выдана роль «Модераторы»',
    children: undefined,
    time: minutesAgo(60 * 26),
    onMarkRead: undefined,
  },
};

export const LongText: Story = {
  name: 'Длинный текст: две строки и многоточие',
  args: {
    unread: true,
    icon: <Icon icon={Bot} size="lg" />,
    title: 'haunt-mod: правило «ссылки новичков» сработало 14 раз за последний час в трёх каналах',
    children:
      'Сообщения с внешними ссылками от участников младше 24 часов скрыты до проверки. Откройте журнал аудита, чтобы посмотреть каждое срабатывание и при необходимости вернуть сообщение в канал.',
  },
};

export const NotClickable: Story = {
  name: 'Без onClick — просто строка',
  args: { onClick: undefined, unread: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: /Мария Орлова/ })).toBeNull();
  },
};
