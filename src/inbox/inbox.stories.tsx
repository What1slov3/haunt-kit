import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Bot, Compass, ShieldCheck } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  Avatar,
  Button,
  Icon,
  Inbox,
  Popover,
  RailItem,
  Surface,
  type InboxNotification,
} from '@haunt/ui';

import {
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

/* «Сейчас» историй зафиксировано: заголовки дней не зависят от даты прогона */
const NOW = new Date(2026, 9, 26, 15, 0).getTime();
const HOUR = 60 * 60_000;

const people = ['Мария Орлова', 'Иван Лебедев', 'Анна Соколова', 'Пётр Волков'];
const channels = ['#дизайн', '#общий', '#релизы', '#голосовая'];

/* Детерминированная лента: упоминания, ответы, приглашения, роли, события бота — раз в 5 часов */
function makeNotifications(count: number, unreadEvery = 3): InboxNotification[] {
  return Array.from({ length: count }, (_, index) => {
    const person = people[index % people.length] ?? '';
    const channel = channels[index % channels.length] ?? '';
    const time = NOW - index * 5 * HOUR - 10 * 60_000;
    const unread = index % unreadEvery === 0;
    const base = { id: `n${index}`, time, unread };

    switch (index % 5) {
      case 0:
        return {
          ...base,
          mention: true,
          icon: <Avatar name={person} size="sm" />,
          title: `${person} упомянула вас в ${channel}`,
          text: '@vagner глянь новый порядок каналов, пожалуйста',
        };
      case 1:
        return {
          ...base,
          icon: <Avatar name={person} size="sm" />,
          title: `${person} ответил в треде`,
          text: 'Согласен, делаем перетаскиванием и с клавиатуры',
        };
      case 2:
        return {
          ...base,
          icon: <Avatar name="Котики" shape="rounded" size="sm" />,
          title: 'Приглашение в «Котики»',
          text: `${person} зовёт вас в пространство`,
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
        };
      case 3:
        return {
          ...base,
          icon: <Icon icon={ShieldCheck} size="lg" />,
          title: 'Вам выдана роль «Модераторы»',
        };
      default:
        return {
          ...base,
          mention: index % 2 === 0,
          icon: <Icon icon={Bot} size="lg" />,
          title: 'haunt-mod: сработало правило «ссылки новичков»',
          text: `${channel}: сообщение скрыто до проверки`,
        };
    }
  });
}

/** Лента с состоянием: прочитать одно, все, открыть — как сделал бы экран */
function InboxDemo({
  count = 24,
  onOpen,
  height,
}: {
  count?: number;
  onOpen?: (notification: InboxNotification) => void;
  height?: number;
}) {
  const [items, setItems] = useState(() => makeNotifications(count));
  const markRead = (id: string) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    );

  return (
    <Inbox
      notifications={items}
      now={NOW}
      height={height}
      onOpen={(notification) => {
        markRead(notification.id);
        onOpen?.(notification);
      }}
      onMarkRead={markRead}
      onMarkAllRead={() =>
        setItems((current) => current.map((item) => ({ ...item, unread: false })))
      }
    />
  );
}

const meta = {
  title: 'Списки/Inbox',
  component: Inbox,
  tags: ['autodocs'],
  args: {
    notifications: makeNotifications(24),
    now: NOW,
    height: 420,
    onOpen: fn(),
    onMarkRead: fn(),
    onMarkAllRead: fn(),
  },
  argTypes: {
    notifications: { control: false },
    now: { control: false },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 400,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--card)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Лента уведомлений: вкладки «Все / Упоминания / Непрочитанные», группы по дням («Сегодня», «Вчера», дата через `Intl`), «Отметить все прочитанными», пустое состояние на каждую вкладку. Строка — `NotificationItem`. Лента виртуализирована (`VirtualList`), `onReachEnd` — подгрузка старых. `now` — «сейчас» для заголовков дней. Размер — под `Popover` из рейла.',
      },
    },
  },
} satisfies Meta<typeof Inbox>;

export default meta;

type Story = StoryObj<typeof meta>;

const list = (canvas: HTMLElement) => within(canvas).getByRole('list');

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { level: 2, name: 'Уведомления' })).toBeVisible();
    await expect(canvas.getByRole('heading', { level: 3, name: 'Сегодня' })).toBeVisible();
    await expect(canvas.getByLabelText('8 непрочитанных')).toBeVisible();
  },
};

export const Filters: Story = {
  name: 'Вкладки и «отметить все прочитанными»',
  render: () => <InboxDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = () => within(list(canvasElement)).getAllByRole('article');

    await userEvent.click(canvas.getByRole('tab', { name: 'Упоминания' }));
    await waitFor(() =>
      expect(articles().every((item) => /упомянула|haunt-mod/.test(item.textContent ?? ''))).toBe(
        true,
      ),
    );

    await userEvent.click(canvas.getByRole('tab', { name: 'Непрочитанные' }));
    await waitFor(() =>
      expect(
        articles().every(
          (item) => item.getAttribute('aria-labelledby') && item.hasAttribute('data-unread'),
        ),
      ).toBe(true),
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Отметить все прочитанными' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('Всё прочитано');
    await expect(canvas.getByRole('button', { name: 'Отметить все прочитанными' })).toBeDisabled();
    await expect(canvas.queryByLabelText(/непрочитанных/)).toBeNull();
  },
};

export const OpenMarksRead: Story = {
  name: 'Открыть — прочитано',
  args: { onOpen: fn() },
  render: (args) => <InboxDemo onOpen={args.onOpen} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const first = within(list(canvasElement)).getAllByRole('article')[0] as HTMLElement;

    await expect(first).toHaveAttribute('data-unread');

    await userEvent.click(within(first).getAllByRole('button')[0] as HTMLElement);
    await expect(args.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'n0' }));
    await waitFor(() =>
      expect(within(list(canvasElement)).getAllByRole('article')[0]).not.toHaveAttribute(
        'data-unread',
      ),
    );
    await expect(canvas.getByLabelText('7 непрочитанных')).toBeVisible();
  },
};

export const LongFeed: Story = {
  name: 'Длинная лента: 2 000 уведомлений',
  args: { notifications: makeNotifications(2000) },
  play: async ({ canvasElement }) => {
    const feed = list(canvasElement);
    const scroller = feed.parentElement as HTMLElement;

    await expect(within(feed).getAllByRole('listitem').length).toBeLessThan(40);

    scroller.scrollTop = scroller.scrollHeight;

    // Самые старые — внизу, с годом: лента уходит в 2025-й
    await waitFor(() => expect(feed.textContent).toMatch(/2025 г\./));
    await expect(within(feed).getAllByRole('listitem').length).toBeLessThan(40);
  },
};

export const Empty: Story = {
  name: 'Пусто',
  args: { notifications: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('Уведомлений нет');
  },
};

/** Поповер из рейла: кнопка-колокольчик со счётчиком, лента справа */
function RailInbox() {
  const [items, setItems] = useState(() => makeNotifications(24));
  const unread = items.filter((item) => item.unread).length;
  const markRead = (id: string) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    );

  return (
    <Surface
      level={1}
      panel
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-1)',
        width: 56,
        height: 520,
        padding: 'var(--space-2) 0',
      }}
    >
      <RailItem label="Пространство" variant="accent">
        <Icon icon={Compass} size="lg" />
      </RailItem>

      <Popover.Root>
        <Popover.Trigger asChild>
          <RailItem label="Уведомления" variant="ghost" unread={unread}>
            <Icon icon={Bell} size="lg" />
          </RailItem>
        </Popover.Trigger>

        <Popover.Content
          side="right"
          align="start"
          flush
          aria-label="Уведомления"
          style={{ width: 380, maxWidth: 'calc(100vw - 16px)' }}
        >
          <Inbox
            notifications={items}
            now={NOW}
            height={360}
            onOpen={(notification) => markRead(notification.id)}
            onMarkRead={markRead}
            onMarkAllRead={() =>
              setItems((current) => current.map((item) => ({ ...item, unread: false })))
            }
          />
        </Popover.Content>
      </Popover.Root>
    </Surface>
  );
}

export const InRailPopover: Story = {
  name: 'В поповере из рейла',
  render: () => <RailInbox />,
  parameters: { docs: { story: { inline: false, height: '560px' } } },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Уведомления' });

    await userEvent.click(trigger);

    const dialog = await screen().findByRole('dialog', { name: 'Уведомления' });

    await expectVisible(dialog);
    await expect(within(dialog).getByRole('heading', { level: 3, name: 'Сегодня' })).toBeVisible();

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Отметить все прочитанными' }),
    );
    await expect(
      within(dialog).getByRole('button', { name: 'Отметить все прочитанными' }),
    ).toBeDisabled();

    await pressEscape();
    await expectGone(() => screen().queryByRole('dialog'));
    await expectFocused(trigger);
  },
};
