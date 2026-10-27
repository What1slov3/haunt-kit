import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import {
  Avatar,
  ChatLayout,
  Heading,
  Input,
  JumpToLatest,
  MessageItem,
  PlaceHeader,
  ScrollArea,
  Stack,
  Text,
} from '@haunt/ui';

import { demoPeople } from '../lib/stories/demo-space';
import { PlaceActions } from '../lib/stories/demo-space-parts';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

const messages = Array.from({ length: 14 }, (_, index) => {
  const person = demoPeople[index % 3]!;

  return {
    id: index,
    author: person.name,
    at: minutesAgo(60 - index * 4),
    text:
      index % 4 === 0
        ? 'Собрала черновик шапок — посмотрите до вечера? Ссылка в закрепе.'
        : `Сообщение ${index + 1}: по-моему, вкладки лучше под шапкой, а не в ней.`,
  };
});

function Feed() {
  return (
    <ScrollArea style={{ flex: 1 }}>
      <Stack gap={1} style={{ padding: 'var(--space-3) 0' }}>
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            author={message.author}
            avatar={<Avatar name={message.author} size="lg" shape="rounded" />}
            timestamp={message.at}
          >
            {message.text}
          </MessageItem>
        ))}
      </Stack>
    </ScrollArea>
  );
}

function Demo({ withPanel }: { withPanel?: boolean }) {
  const [unread, setUnread] = useState(3);

  return (
    <ChatLayout
      header={
        <PlaceHeader
          name="дизайн"
          topic="Обсуждаем шапки и лейауты"
          live={{ count: 3, people: demoPeople.slice(0, 3) }}
          actions={<PlaceActions />}
        />
      }
      composer={<Input placeholder="Написать в #дизайн" fullWidth />}
      overlay={<JumpToLatest visible={unread > 0} count={unread} onJump={() => setUnread(0)} />}
      panel={
        withPanel && (
          <Stack gap={2} style={{ padding: 'var(--space-4)' }}>
            <Heading level={2} size="sm">
              Тред
            </Heading>

            <Text size="sm" tone="muted">
              Ответы на «черновик шапок» — 6 сообщений.
            </Text>
          </Stack>
        )
      }
      panelLabel="Тред"
    >
      <Feed />
    </ChatLayout>
  );
}

const meta = {
  title: 'Лейауты/ChatLayout',
  component: ChatLayout,
  tags: ['autodocs'],
  args: { children: null },
  argTypes: { children: { control: false } },
  decorators: [
    (Story) => (
      <div
        style={{
          height: 560,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
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
          'Место-чат на всю высоту: шапка (`header` — `PlaceHeader`), лента между ней и композером (`children` — `VirtualList` или `ScrollArea`: прокрутку держит она, раскладка даёт ей высоту), композер прижат к низу (`composer`), над ним по центру — `overlay` (`JumpToLatest`, «печатает…»). Панель треда — `panel` справа; уже 720 px (ширина самой раскладки, не окна) ложится поверх ленты. Высоту даёт родитель — в AppShell область содержимого.',
      },
    },
  },
  render: () => <Demo withPanel />,
} satisfies Meta<typeof ChatLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'С панелью треда',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const root = canvasElement.querySelector<HTMLElement>('main')!.parentElement!;
    const composer = canvas.getByPlaceholderText('Написать в #дизайн').getBoundingClientRect();

    // Композер прижат к низу раскладки, панель — справа
    await expect(root.getBoundingClientRect().bottom - composer.bottom).toBeLessThan(24);
    await expect(canvas.getByRole('complementary', { name: 'Тред' })).toBeVisible();
  },
};

export const WithoutPanel: Story = {
  name: 'Без панели',
  render: () => <Demo />,
};

export const NarrowPanel: Story = {
  name: 'Узко — панель поверх ленты',
  decorators: [
    (Story) => (
      <div style={{ width: 560, height: '100%' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement).getByRole('complementary', { name: 'Тред' });

    await expect(getComputedStyle(panel).position).toBe('absolute');
  },
};
