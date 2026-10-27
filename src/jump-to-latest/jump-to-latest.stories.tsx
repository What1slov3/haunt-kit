import { useRef, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  Avatar,
  Button,
  JumpToLatest,
  MessageItem,
  VirtualList,
  groupMessages,
  type VirtualListHandle,
} from '@haunt/ui';

import { expectGone } from '../lib/stories/play-helpers';

const meta = {
  title: 'Сообщество/JumpToLatest',
  component: JumpToLatest,
  tags: ['autodocs'],
  args: { visible: true, onJump: fn() },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 520, height: 120 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Плавающая кнопка «к последним» со счётчиком новых у нижнего края ленты: появляется и уходит через `Presence` (`rise`), стекло — как у плавающего. Когда показывать и сколько новых — решает экран: он знает, внизу ли список. Клик — `onJump`, обычно `VirtualList` `scrollToEnd()`. `floating={false}` — в потоке, без абсолютного слоя.',
      },
    },
  },
} satisfies Meta<typeof JumpToLatest>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'К последним' }));

    await expect(args.onJump).toHaveBeenCalledTimes(1);
  },
};

export const WithCount: Story = {
  name: 'Со счётчиком',
  args: { count: 12 },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'К последним, 12 новых сообщений',
    });

    await userEvent.click(button);

    await expect(args.onJump).toHaveBeenCalledTimes(1);
  },
};

export const Hidden: Story = {
  name: 'Скрыта',
  args: { visible: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
  },
};

interface Line {
  id: number;
  authorId: string;
  at: number;
}

const authors: Record<string, string> = { ada: 'Ада Лавлейс', lev: 'Лев', ira: 'Ира' };
const start = Date.now() - 200 * 60_000;
const history: Line[] = Array.from({ length: 120 }, (_, index) => ({
  id: index,
  authorId: ['ada', 'lev', 'ira'][Math.floor(index / 3) % 3] ?? 'ada',
  at: start + index * 60_000,
}));

/** Внизу ли лента — с допуском на дробные пиксели прокрутки */
const atBottom = (element: HTMLElement) =>
  element.scrollHeight - element.scrollTop - element.clientHeight < 24;

function ChatDemo() {
  const list = useRef<VirtualListHandle>(null);
  const [lines, setLines] = useState(history);
  const [away, setAway] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const grouped = groupMessages(lines, {
    author: (line) => line.authorId,
    time: (line) => line.at,
  });

  return (
    <div style={{ width: 560 }}>
      <div style={{ position: 'relative' }}>
        <VirtualList
          ref={list}
          items={lines}
          getKey={(line) => line.id}
          estimateSize={(_, index) => (grouped[index] ? 26 : 52)}
          height={360}
          reverse
          label="Сообщения"
          onScroll={(event) => {
            const bottom = atBottom(event.currentTarget);

            setAway(!bottom);

            if (bottom) setUnseen(0);
          }}
          renderItem={(line, index) => (
            <MessageItem
              author={authors[line.authorId]}
              avatar={<Avatar name={authors[line.authorId] ?? ''} size="lg" shape="rounded" />}
              timestamp={line.at}
              grouped={grouped[index]}
              groupEnd={!grouped[index + 1]}
            >
              Сообщение №{line.id + 1}
            </MessageItem>
          )}
        />

        <JumpToLatest
          visible={away}
          count={unseen}
          onJump={() => {
            list.current?.scrollToEnd();
            setUnseen(0);
          }}
        />
      </div>

      <Button
        size="sm"
        style={{ marginTop: 8 }}
        onClick={() => {
          setLines((current) => [
            ...current,
            { id: current.length, authorId: 'lev', at: Date.now() },
          ]);

          if (away) setUnseen((count) => count + 1);
        }}
      >
        Пришло сообщение
      </Button>
    </div>
  );
}

export const WithVirtualList: Story = {
  name: 'С VirtualList',
  decorators: [(Story) => <Story />],
  render: () => <ChatDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroller = within(canvasElement).getByRole('list', { name: 'Сообщения' }).parentElement!;

    await waitFor(() => expect(atBottom(scroller)).toBe(true));
    await expect(canvas.queryByRole('button', { name: /К последним/ })).toBeNull();

    // Ушли вверх читать историю — кнопка появилась, новые считаются
    scroller.scrollTop = 0;
    scroller.dispatchEvent(new Event('scroll'));

    await waitFor(() => expect(canvas.getByRole('button', { name: 'К последним' })).toBeVisible());

    await userEvent.click(canvas.getByRole('button', { name: 'Пришло сообщение' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Пришло сообщение' }));

    await userEvent.click(
      await canvas.findByRole('button', { name: 'К последним, 2 новых сообщения' }),
    );

    await waitFor(() => expect(atBottom(scroller)).toBe(true));
    await expectGone(() => canvas.queryByRole('button', { name: /К последним/ }));
  },
};
