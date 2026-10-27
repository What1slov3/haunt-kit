import { useRef, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hash } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  Avatar,
  Button,
  EmptyState,
  Icon,
  Inline,
  NavItem,
  Spinner,
  Stack,
  Text,
  Timestamp,
  VirtualList,
  type VirtualListHandle,
} from '@haunt/ui';

interface Member {
  id: string;
  name: string;
  role: string;
}

const firstNames = ['Анна', 'Борис', 'Вера', 'Глеб', 'Дина', 'Егор', 'Жанна', 'Илья'];
const lastNames = ['Орлова', 'Петров', 'Соколова', 'Тихонов', 'Уварова', 'Фёдоров'];
const roles = ['участник', 'участник', 'модератор', 'участник', 'бот'];

function makeMembers(count: number): Member[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `m${index}`,
    name: `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]} ${index + 1}`,
    role: roles[index % roles.length] ?? 'участник',
  }));
}

interface Message {
  id: number;
  author: string;
  text: string;
  time: number;
}

const authors = ['Мария Орлова', 'Иван Лебедев', 'Анна Соколова', 'Пётр Волков', 'haunt-mod'];
const phrases = [
  'привет всем',
  'кто сегодня в голосовом?',
  'скинул макет в #дизайн — посмотрите, когда будет минутка, особенно экран настроек ролей и порядок каналов',
  'ок',
  'завтра созвон в 19:00',
  'Сборка: 3 предупреждения, 0 ошибок. Подробности в треде, там же ссылка на артефакт и журнал.',
  'а можно добавить сортировку каналов перетаскиванием?',
  'да, уже в работе',
];
const chatStart = new Date(2026, 9, 1, 9, 0, 0).getTime();

/* Детерминированная лента: длина текста меняется от сообщения к сообщению — строки разной высоты */
function makeMessage(id: number): Message {
  const base = phrases[(id * 13) % phrases.length] ?? '';
  const text = id % 9 === 0 ? `${base} ${phrases[2]} ${phrases[5]}` : base;

  return {
    id,
    author: authors[(id * 7) % authors.length] ?? '',
    text,
    time: chatStart + id * 45_000,
  };
}

function makeMessages(from: number, count: number): Message[] {
  return Array.from({ length: count }, (_, index) => makeMessage(from + index));
}

function MessageRow({ message }: { message: Message }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        padding: 'var(--space-1-5) var(--space-3)',
      }}
    >
      <Avatar name={message.author} size="sm" />

      <div style={{ minWidth: 0, flex: 1 }}>
        <Inline gap={2}>
          <Text weight="semibold">{message.author}</Text>

          <Text size="xs" tone="subtle" mono>
            #{message.id + 1} · <Timestamp date={message.time} mode="time" tooltip={false} />
          </Text>
        </Inline>

        <Text as="p" size="lg" wrap style={{ margin: 0 }}>
          {message.text}
        </Text>
      </div>
    </div>
  );
}

const MemberList = VirtualList<Member>;

const frame = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--card)',
};

const meta = {
  title: 'Списки/VirtualList',
  component: MemberList,
  tags: ['autodocs'],
  args: {
    items: makeMembers(1000),
    getKey: (member) => member.id,
    renderItem: (member) => (
      <div style={{ padding: '0 var(--space-1)' }}>
        <NavItem density="default" icon={<Avatar name={member.name} size="xs" />}>
          {member.name}
        </NavItem>
      </div>
    ),
    estimateSize: 32,
    height: 320,
    label: 'Участники',
    style: frame,
  },
  argTypes: {
    items: { control: false },
    getKey: { control: false },
    renderItem: { control: false },
    estimateSize: { control: false },
    header: { control: false },
    footer: { control: false },
    empty: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Виртуализированный список: в DOM только строки в окне и запас `overscan` вокруг. Высота строк любая — сначала оценка `estimateSize`, затем измерение `ResizeObserver`, кэш высот по ключу `getKey`. Строка, выросшая выше окна, не сдвигает то, что читают: прокрутка поправляется на ту же разницу. Режим чата — `reverse` (короткий список прижат к низу, открывается внизу) и `stickToBottom` (держится низа, пока пользователь внизу); подгрузка — `onReachStart` / `onReachEnd`, при подгрузке сверху позиция сохраняется по якорю без прыжка. `ref` даёт `scrollToIndex(index, align)` и `scrollToEnd()`. Своя область прокрутки с тонкой полосой, а не `ScrollArea`: окну нужен прямой доступ к прокрутке. Доступность: `role="list"`, у строк `aria-setsize` / `aria-posinset`; строка с фокусом, ушедшая за окно, отдаёт фокус области прокрутки.',
      },
    },
  },
} satisfies Meta<typeof MemberList>;

export default meta;

type Story = StoryObj<typeof meta>;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Несколько кадров: событие прокрутки → рендер нового окна → ResizeObserver измерил → поправка. Раньше
 * getBoundingClientRect видит промежуточную раскладку, которую браузер так и не нарисует
 */
async function settle(frames = 4): Promise<void> {
  for (let index = 0; index < frames; index += 1) await nextFrame();
}

const scrollerOf = (canvas: HTMLElement, name: string) => {
  const list = within(canvas).getByRole('list', { name });

  return { list, scroller: list.parentElement as HTMLElement };
};

export const Default: Story = {
  name: '1 000 участников',
  play: async ({ canvasElement }) => {
    const { list } = scrollerOf(canvasElement, 'Участники');
    const rows = within(list).getAllByRole('listitem');

    await expect(rows.length).toBeLessThan(40);
    await expect(rows[0]).toHaveAttribute('aria-setsize', '1000');
    await expect(rows[0]).toHaveAttribute('aria-posinset', '1');
  },
};

export const ScrollRendersFarRows: Story = {
  name: 'Прокрутка рисует дальние строки, DOM не растёт',
  args: { items: makeMembers(10_000) },
  play: async ({ canvasElement }) => {
    const { list, scroller } = scrollerOf(canvasElement, 'Участники');

    await expect(within(list).queryByText('Дина Орлова 5005')).toBeNull();

    scroller.scrollTop = 32 * 5000;

    await waitFor(() => expect(within(list).getByText('Дина Орлова 5005')).toBeVisible());

    const rows = within(list).getAllByRole('listitem');

    // В окне 10 строк и запас по 6 с каждой стороны — не 10 000
    await expect(rows.length).toBeLessThan(40);
    await expect(Number(rows[0]?.getAttribute('aria-posinset'))).toBeGreaterThan(4900);

    scroller.scrollTop = scroller.scrollHeight;

    await waitFor(() => expect(within(list).getByText('Илья Тихонов 10000')).toBeVisible());
  },
};

/** Чат на 10 000 сообщений: открывается внизу, новые сообщения прокручивают, пока читатель внизу */
function ChatDemo({ initial = 10_000 }: { initial?: number }) {
  const [messages, setMessages] = useState(() => makeMessages(0, initial));
  const send = () => setMessages((current) => [...current, makeMessage(current.length)]);

  return (
    <Stack gap={2} align="start">
      <Button size="sm" onClick={send}>
        Новое сообщение
      </Button>

      <VirtualList
        items={messages}
        getKey={(message) => message.id}
        renderItem={(message) => <MessageRow message={message} />}
        estimateSize={52}
        reverse
        height={420}
        label="Сообщения #общий"
        style={{ ...frame, width: '100%' }}
      />
    </Stack>
  );
}

export const Chat: Story = {
  name: 'Чат на 10 000 сообщений',
  render: () => <ChatDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { list, scroller } = scrollerOf(canvasElement, 'Сообщения #общий');
    const atBottom = () =>
      expect(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight).toBeLessThan(9);

    // Открылся внизу: последнее сообщение на экране
    await waitFor(() => expect(within(list).getByText(/#10000 ·/)).toBeVisible());
    await waitFor(atBottom);
    await expect(within(list).getAllByRole('listitem').length).toBeLessThan(60);

    // Внизу — новое сообщение прокручивает
    await userEvent.click(canvas.getByRole('button', { name: 'Новое сообщение' }));
    await waitFor(() => expect(within(list).getByText(/#10001 ·/)).toBeVisible());
    await waitFor(atBottom);

    // Прокрутили читать — новое сообщение окно не сдвигает
    scroller.scrollTop = scroller.scrollTop - 1500;
    await settle();

    // Первое сообщение, видимое целиком: за ним и следим
    const top = scroller.getBoundingClientRect().top;
    const reading = within(list)
      .getAllByRole('listitem')
      .find((row) => row.getBoundingClientRect().top >= top) as HTMLElement;
    const before = reading.getBoundingClientRect().top;

    await userEvent.click(canvas.getByRole('button', { name: 'Новое сообщение' }));
    await waitFor(() =>
      expect(within(list).getAllByRole('listitem')[0]).toHaveAttribute('aria-setsize', '10002'),
    );
    await settle();
    await expect(Math.abs(reading.getBoundingClientRect().top - before)).toBeLessThan(2);
  },
};

export const ShortChat: Story = {
  name: 'Короткий чат прижат к низу',
  render: () => <ChatDemo initial={3} />,
};

const PAGE = 50;
const HISTORY = 10_000;

/** История подгружается сверху страницами по 50: позиция чтения не прыгает */
function LoadOlderDemo({ onLoad, delay }: { onLoad: () => void; delay: number }) {
  const [messages, setMessages] = useState(() => makeMessages(HISTORY - PAGE, PAGE));
  const [loading, setLoading] = useState(false);
  const firstId = messages[0]?.id ?? 0;

  const loadOlder = () => {
    if (loading || firstId === 0) return;

    onLoad();
    setLoading(true);
    setTimeout(() => {
      const from = Math.max(0, firstId - PAGE);

      setMessages((current) => [...makeMessages(from, firstId - from), ...current]);
      setLoading(false);
    }, delay);
  };

  return (
    <VirtualList
      items={messages}
      getKey={(message) => message.id}
      renderItem={(message) => <MessageRow message={message} />}
      estimateSize={52}
      reverse
      onReachStart={loadOlder}
      height={420}
      label="Сообщения #новости"
      style={frame}
      header={
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2)' }}>
          {firstId === 0 ? (
            <Text size="sm" tone="subtle">
              Начало канала #новости
            </Text>
          ) : (
            <Inline gap={2}>
              <Spinner size="sm" />

              <Text size="sm" tone="subtle">
                загружаем историю…
              </Text>
            </Inline>
          )}
        </div>
      }
    />
  );
}

export const LoadOlder: Story = {
  name: 'Подгрузка истории сверху без прыжка',
  args: { onReachStart: fn() },
  render: (args) => <LoadOlderDemo onLoad={args.onReachStart ?? (() => {})} delay={250} />,
  play: async ({ args, canvasElement }) => {
    const { list, scroller } = scrollerOf(canvasElement, 'Сообщения #новости');

    await waitFor(() => expect(within(list).getByText(/#10000 ·/)).toBeVisible());
    await expect(args.onReachStart).not.toHaveBeenCalled();

    // Докрутили почти до начала загруженного: под краем окна — сообщение #9952
    scroller.scrollTop = 120;

    await waitFor(() => expect(args.onReachStart).toHaveBeenCalledTimes(1));
    // Строки у начала только что дорисованы и измерены — ждём, пока прокрутка поправится
    await settle();

    const reading = within(list).getByText(/#9952 ·/);
    const before = reading.getBoundingClientRect().top;

    // Подгрузилось 50 старых сверху — читаемое сообщение осталось там же
    await waitFor(() =>
      expect(within(list).getAllByRole('listitem')[0]).toHaveAttribute('aria-setsize', '100'),
    );
    await waitFor(() =>
      expect(
        Math.abs(
          within(list)
            .getByText(/#9952 ·/)
            .getBoundingClientRect().top - before,
        ),
      ).toBeLessThan(2),
    );
    await expect(scroller.scrollTop).toBeGreaterThan(1000);
  },
};

function ScrollToIndexDemo(props: Story['args']) {
  const listRef = useRef<VirtualListHandle>(null);

  return (
    <Stack gap={2}>
      <Inline gap={2}>
        <Button size="sm" onClick={() => listRef.current?.scrollToIndex(4999, 'center')}>
          К №5000
        </Button>

        <Button size="sm" onClick={() => listRef.current?.scrollToIndex(0, 'start')}>
          В начало
        </Button>

        <Button size="sm" onClick={() => listRef.current?.scrollToEnd()}>
          В конец
        </Button>
      </Inline>

      <MemberList {...meta.args} {...props} items={makeMembers(10_000)} ref={listRef} />
    </Stack>
  );
}

export const ScrollToIndex: Story = {
  name: 'scrollToIndex через ref',
  render: (args) => <ScrollToIndexDemo {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { list, scroller } = scrollerOf(canvasElement, 'Участники');

    await userEvent.click(canvas.getByRole('button', { name: 'К №5000' }));

    await waitFor(() => {
      const row = within(list).getByText('Илья Петров 5000');
      const rowBox = row.getBoundingClientRect();
      const box = scroller.getBoundingClientRect();

      expect(rowBox.top).toBeGreaterThanOrEqual(box.top);
      expect(rowBox.bottom).toBeLessThanOrEqual(box.bottom);
    });

    await userEvent.click(canvas.getByRole('button', { name: 'В конец' }));
    await waitFor(() => expect(within(list).getByText('Илья Тихонов 10000')).toBeVisible());

    await userEvent.click(canvas.getByRole('button', { name: 'В начало' }));
    await waitFor(() => expect(within(list).getByText('Анна Орлова 1')).toBeVisible());
  },
};

export const WithChannels: Story = {
  name: 'Каналы: строки разной высоты',
  args: { items: makeMembers(400), estimateSize: 30, label: 'Каналы' },
  render: (args) => (
    <MemberList
      {...args}
      renderItem={(member, index) => (
        <div style={{ padding: '0 var(--space-1)' }}>
          <NavItem
            icon={<Icon icon={Hash} size="sm" />}
            description={index % 3 === 0 ? `${member.name}: последнее сообщение` : undefined}
            unread={index % 7 === 0 ? index % 40 : undefined}
          >
            {`канал-${index + 1}`}
          </NavItem>
        </div>
      )}
    />
  ),
};

export const Empty: Story = {
  args: {
    items: [],
    empty: <EmptyState compact title="Никого нет" description="Пригласите участников." />,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Никого нет')).toBeVisible();
  },
};
