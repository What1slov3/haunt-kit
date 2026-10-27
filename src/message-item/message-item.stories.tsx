import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, MoreHorizontal, Pencil, Pin, Reply, Smile, Trash2 } from 'lucide-react';
import { expect, fireEvent, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  Avatar,
  Badge,
  ContextMenu,
  DateDivider,
  Icon,
  IconButton,
  Markdown,
  MessageItem,
  MessageMedia,
  ReactionBar,
  ReplyPreview,
  Textarea,
  Tooltip,
  UnreadDivider,
  groupMessages,
  sameDay,
  toggleReaction,
  type ReactionItem,
} from '@haunt/ui';

import { expectGone, expectVisible, pressEscape, screen } from '../lib/stories/play-helpers';
import { photos } from '../lib/stories/demo-photos';

const MINUTE = 60_000;
// Лента «сегодня»: сразу после полуночи сдвигаем якорь на час вперёд, чтобы свежие сообщения не ушли во вчера
const midnight = new Date().setHours(0, 0, 0, 0);
const now = Math.max(Date.now(), midnight + 60 * MINUTE);
const ago = (minutes: number) => now - minutes * MINUTE;

function Actions() {
  return (
    <>
      <Tooltip content="Реакция">
        <IconButton label="Реакция" size="sm">
          <Icon icon={Smile} size="sm" />
        </IconButton>
      </Tooltip>

      <Tooltip content="Ответить" shortcut="R">
        <IconButton label="Ответить" size="sm">
          <Icon icon={Reply} size="sm" />
        </IconButton>
      </Tooltip>

      <Tooltip content="Ещё">
        <IconButton label="Ещё" size="sm">
          <Icon icon={MoreHorizontal} size="sm" />
        </IconButton>
      </Tooltip>
    </>
  );
}

const menu = (
  <>
    <ContextMenu.Item icon={<Icon icon={Reply} size="sm" />} shortcut="R">
      Ответить
    </ContextMenu.Item>
    <ContextMenu.Item icon={<Icon icon={Copy} size="sm" />}>Копировать текст</ContextMenu.Item>
    <ContextMenu.Item icon={<Icon icon={Pin} size="sm" />}>Закрепить</ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item icon={<Icon icon={Pencil} size="sm" />}>Изменить</ContextMenu.Item>
    <ContextMenu.Item icon={<Icon icon={Trash2} size="sm" />} danger>
      Удалить
    </ContextMenu.Item>
  </>
);

const meta = {
  title: 'Сообщество/MessageItem',
  component: MessageItem,
  tags: ['autodocs'],
  args: {
    author: 'Ада Лавлейс',
    avatar: <Avatar name="Ада Лавлейс" size="lg" shape="rounded" />,
    timestamp: ago(12),
    children: (
      <Markdown>{'Собрала **черновик** правил пространства — посмотрите до вечера?'}</Markdown>
    ),
    actions: <Actions />,
    onRetry: fn(),
  },
  argTypes: {
    avatar: { control: false },
    badges: { control: false },
    children: { control: false },
    reply: { control: false },
    attachments: { control: false },
    reactions: { control: false },
    actions: { control: false },
    contextMenu: { control: false },
  },
  decorators: [
    (Story) => (
      // Отступ сверху — под панель действий первой строки
      <div data-message-list style={{ width: 620, paddingTop: 16 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Строка ленты сообщений — раскладка без бизнес-логики, данные пропсами, части слотами: `avatar`, шапка (`author` цветом роли `authorColor`, `badges`, `Timestamp`), `reply` (`ReplyPreview` — строка-след `↳` над шапкой), тело `children` (обычно `Markdown`), `attachments` (`MessageMedia`), `reactions` (`ReactionBar`), `actions` — кнопки при наведении и фокусе внутри, в той же строке рядом со временем у правого края, `contextMenu` — пункты `ContextMenu`. Режимы: первое в группе / продолжение (`grouped`: след автора — линия его цвета от аватара вниз, время справа при наведении; шапку слышит скринридер), последнее в группе (`groupEnd` — отступ снизу, `!grouped[i + 1]`), `compact`. Состояния: `highlighted`, `mentioned`, `editing`, `pending`, `failed` + `onRetry`, `edited` (время правки — в подсказке), `deleted`. Строка фокусируема, ↑ / ↓ — соседние сообщения. Склейку соседних (тот же автор, < 5 минут, тот же день) считает `groupMessages`.',
      },
    },
  },
} satisfies Meta<typeof MessageItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const First: Story = {
  name: 'Первое в группе',
  args: {
    authorColor: 'var(--success)',
    badges: (
      <Badge size="sm" tone="success" bracket>
        админ
      </Badge>
    ),
  },
};

export const Continued: Story = {
  name: 'Продолжение группы',
  render: (args) => (
    <>
      <MessageItem {...args} />
      <MessageItem {...args} grouped timestamp={ago(11)} avatar={undefined}>
        <Markdown>{'Там всего три пункта, остальное — по ссылке.'}</Markdown>
      </MessageItem>
    </>
  ),
};

export const Compact: Story = {
  name: 'Компактная лента',
  render: (args) => (
    <>
      <MessageItem {...args} compact />
      <MessageItem {...args} compact author="Лев" authorColor="var(--info)" timestamp={ago(10)}>
        <Markdown>
          {
            'Посмотрю. Длинная строка в компактном режиме переносится под текст, а не под время и имя — колонка остаётся ровной.'
          }
        </Markdown>
      </MessageItem>
    </>
  ),
};

export const Mentioned: Story = {
  name: 'Упоминание',
  args: { mentioned: true, children: <Markdown>{'@вы, глянь закреп в #правила'}</Markdown> },
};

export const Highlighted: Story = { name: 'Подсвечено', args: { highlighted: true } };

export const Editing: Story = {
  name: 'Правка',
  args: {
    editing: true,
    children: <Textarea defaultValue="Собрала черновик правил пространства" autoGrow fullWidth />,
  },
};

export const Pending: Story = { name: 'Отправляется', args: { pending: true, timestamp: now } };

export const Failed: Story = {
  name: 'Не отправлено — повторить',
  args: { failed: true, timestamp: now },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Не отправлено')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Повторить' }));

    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

export const Edited: Story = {
  name: 'Изменено',
  args: { edited: ago(3) },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByText('изменено'));

    await waitFor(() => expect(screen().getByRole('tooltip')).toHaveTextContent(/^Изменено /));
  },
};

export const Deleted: Story = {
  name: 'Удалено',
  args: { deleted: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Сообщение удалено')).toBeVisible();
    await expect(canvas.queryByRole('group', { name: 'Действия с сообщением' })).toBeNull();
  },
};

export const WithReply: Story = {
  name: 'С ответом',
  args: {
    author: 'Лев',
    authorColor: 'var(--info)',
    avatar: <Avatar name="Лев" size="lg" shape="rounded" />,
    reply: (
      <ReplyPreview
        author="Ада Лавлейс"
        authorColor="var(--success)"
        text="Собрала **черновик** правил пространства — посмотрите до вечера?"
        onJump={fn()}
      />
    ),
    children: <Markdown>{'Да, вечером гляну и оставлю комментарии.'}</Markdown>,
  },
};

const reactions: ReactionItem[] = [
  { emoji: '🔥', name: 'огонь', count: 4, mine: true, users: ['Ада', 'Лев', 'Ира'] },
  { emoji: '👀', name: 'глаза', count: 2, users: ['Олег', 'Ира'] },
];

function LiveReactions() {
  const [items, setItems] = useState(reactions);

  return (
    <ReactionBar
      reactions={items}
      size="sm"
      onToggle={(emoji, mine) => setItems((current) => toggleReaction(current, emoji, mine))}
      onAdd={(emoji) => setItems((current) => toggleReaction(current, emoji, true))}
    />
  );
}

export const WithAttachments: Story = {
  name: 'Вложения и реакции',
  args: {
    attachments: (
      <MessageMedia
        items={[
          {
            src: photos.orb.src,
            name: 'восход.jpg',
            width: photos.orb.width,
            height: photos.orb.height,
          },
        ]}
      />
    ),
    reactions: <LiveReactions />,
  },
};

export const WithContextMenu: Story = {
  name: 'Контекстное меню',
  args: { contextMenu: menu },
  play: async ({ canvasElement }) => {
    fireEvent.contextMenu(within(canvasElement).getByRole('article'));

    await expectVisible(await screen().findByRole('menu'));
    await pressEscape();
    await expectGone(() => screen().queryByRole('menu'));
  },
};

export const ActionsOnFocus: Story = {
  name: 'Действия по фокусу, ↑ / ↓',
  render: (args) => (
    <>
      <MessageItem {...args} />
      <MessageItem {...args} grouped timestamp={ago(11)}>
        <Markdown>{'Второе сообщение'}</Markdown>
      </MessageItem>
      <MessageItem {...args} grouped timestamp={ago(10)}>
        <Markdown>{'Третье сообщение'}</Markdown>
      </MessageItem>
    </>
  ),
  play: async ({ canvasElement }) => {
    const [first, second, third] = within(canvasElement).getAllByRole('article');
    const actionsOf = (row: HTMLElement) =>
      within(row).getByRole('group', { name: 'Действия с сообщением' });

    await expect(getComputedStyle(actionsOf(first!)).opacity).toBe('0');

    await userEvent.tab();
    await expect(first).toHaveFocus();
    await waitFor(() => expect(getComputedStyle(actionsOf(first!)).opacity).toBe('1'));

    await userEvent.keyboard('{ArrowDown}');
    await expect(second).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    await expect(third).toHaveFocus();

    // Дальше некуда — фокус остаётся
    await userEvent.keyboard('{ArrowDown}');
    await expect(third).toHaveFocus();

    await userEvent.keyboard('{ArrowUp}');
    await expect(second).toHaveFocus();
    // У продолжения автор не виден, но строка подписана им
    await expect(second).toHaveAccessibleName(/^Ада Лавлейс/);
  },
};

interface FeedMessage {
  id: string;
  authorId: string;
  author: string;
  color?: string;
  role?: string;
  at: number;
  text: string;
}

const day = 24 * 60;
const feed: FeedMessage[] = [
  {
    id: 'm1',
    authorId: 'ada',
    author: 'Ада Лавлейс',
    color: 'var(--success)',
    role: 'админ',
    at: ago(day + 30),
    text: 'Вчерашнее: созвон перенесли на завтра.',
  },
  {
    id: 'm2',
    authorId: 'lev',
    author: 'Лев',
    color: 'var(--info)',
    at: ago(40),
    text: 'Всем привет!',
  },
  {
    id: 'm3',
    authorId: 'lev',
    author: 'Лев',
    color: 'var(--info)',
    at: ago(38),
    text: 'Кто уже видел новые правила?',
  },
  {
    id: 'm4',
    authorId: 'lev',
    author: 'Лев',
    color: 'var(--info)',
    at: ago(35),
    text: 'Там про ветки стало понятнее.',
  },
  {
    id: 'm5',
    authorId: 'ada',
    author: 'Ада Лавлейс',
    color: 'var(--success)',
    role: 'админ',
    at: ago(34),
    text: 'Я видела, мне нравится.',
  },
  {
    id: 'm6',
    authorId: 'ada',
    author: 'Ада Лавлейс',
    color: 'var(--success)',
    role: 'админ',
    at: ago(20),
    text: 'Через 14 минут — новая группа, даже у того же автора.',
  },
  {
    id: 'm7',
    authorId: 'ada',
    author: 'Ада Лавлейс',
    color: 'var(--success)',
    role: 'админ',
    at: ago(19),
    text: 'А это снова продолжение.',
  },
];

const grouped = groupMessages(feed, {
  author: (message) => message.authorId,
  time: (message) => message.at,
});

function Feed() {
  return (
    <div role="log" aria-label="Сообщения" data-message-list>
      {feed.map((message, index) => {
        const previous = feed[index - 1];

        return (
          <div key={message.id}>
            {(!previous || !sameDay(previous.at, message.at)) && (
              <DateDivider date={message.at} style={{ padding: '8px 16px' }} />
            )}

            {message.id === 'm6' && <UnreadDivider count={2} style={{ padding: '4px 16px' }} />}

            <MessageItem
              data-testid={message.id}
              author={message.author}
              authorColor={message.color}
              avatar={<Avatar name={message.author} size="lg" shape="rounded" />}
              badges={
                message.role && (
                  <Badge size="sm" tone="success" bracket>
                    {message.role}
                  </Badge>
                )
              }
              timestamp={message.at}
              grouped={grouped[index]}
              groupEnd={!grouped[index + 1]}
              actions={<Actions />}
              contextMenu={menu}
            >
              <Markdown>{message.text}</Markdown>
            </MessageItem>
          </div>
        );
      })}
    </div>
  );
}

export const Grouping: Story = {
  name: 'Группировка ленты',
  render: () => <Feed />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const isGrouped = (id: string) => canvas.getByTestId(id).hasAttribute('data-grouped');

    // Тот же автор подряд в пределах пяти минут — продолжение; пауза, другой автор, другой день — шапка
    await expect(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'].map(isGrouped)).toEqual([
      false,
      false,
      true,
      true,
      false,
      false,
      true,
    ]);
    await expect(canvas.getAllByRole('separator', { name: /вчера|сегодня/ })).toHaveLength(2);
    await expect(canvas.getByRole('separator', { name: '2 новых сообщения' })).toBeInTheDocument();
  },
};
