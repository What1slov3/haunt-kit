import type { Meta, StoryObj } from '@storybook/react-vite';
import { CalendarPlus, MessageSquare, Pin, Shield, UserMinus, UserPlus } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { Mention, Timeline, type TimelineEvent } from '@haunt/ui';

import { chartFrame } from '../lib/stories/data-frame';

const NOW = new Date(2026, 9, 26, 18, 0);
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

const events: TimelineEvent[] = [
  {
    id: '1',
    date: at(26, 17, 40),
    type: 'pin',
    title: (
      <>
        Закреплено сообщение в <Mention kind="channel">general</Mention>
      </>
    ),
  },
  { id: '2', date: at(26, 16, 5), type: 'join', title: 'Кира вошла в пространство' },
  { id: '3', date: at(26, 15, 50), type: 'join', title: 'Макс вошёл в пространство' },
  { id: '4', date: at(26, 15, 20), type: 'join', title: 'Юля вошла в пространство' },
  { id: '5', date: at(26, 14, 10), type: 'join', title: 'Олег вошёл в пространство' },
  {
    id: '6',
    date: at(26, 12, 0),
    type: 'event',
    title: 'Создано событие «Рейд в пятницу»',
    description: 'Пятница, 20:00 · голосовой канал raid',
  },
  { id: '7', date: at(25, 22, 30), type: 'role', title: 'Аня получила роль «Модератор»' },
  { id: '8', date: at(25, 21, 0), type: 'leave', title: 'Петя покинул пространство' },
  {
    id: '9',
    date: at(25, 10, 0),
    type: 'message',
    title: 'Новое правило в #rules',
    description: 'Без спойлеров к новым сериям в общих каналах — только под тегом спойлера.',
  },
  { id: '10', date: new Date(2026, 8, 30, 9, 0), type: 'event', title: 'Пространство создано' },
];

const types = {
  join: { icon: UserPlus, tone: 'success' },
  leave: { icon: UserMinus, tone: 'neutral' },
  role: { icon: Shield, tone: 'accent' },
  pin: { icon: Pin, tone: 'warning' },
  event: { icon: CalendarPlus, tone: 'info' },
  message: { icon: MessageSquare, tone: 'neutral' },
} as const;

const meta = {
  title: 'Данные/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  args: { events, types, now: NOW },
  argTypes: { events: { control: false }, types: { control: false }, now: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ ...chartFrame, maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Лента событий пространства: разделители дней («Сегодня», «Вчера», дата — год только у прошлых лет), тип — иконкой и цветом в кружке на линии (`types`), время — `Timestamp`. Похожие подряд (тот же `type` и `groupKey`, от трёх) сворачиваются в первое и кнопку «+N похожих». День — местный.',
      },
    },
  },
} satisfies Meta<typeof Timeline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Сегодня')).toBeInTheDocument();
    await expect(canvas.getByText('Вчера')).toBeInTheDocument();
    await expect(canvas.getByText('30 сентября')).toBeInTheDocument();
  },
};

export const ExpandGroup: Story = {
  name: 'Раскрыть похожие',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const more = canvas.getByRole('button', { name: '+3 похожих' });

    await expect(canvas.queryByText('Олег вошёл в пространство')).toBeNull();
    await userEvent.click(more);
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText('Олег вошёл в пространство')).toBeInTheDocument();
  },
};

export const Ungrouped: Story = {
  name: 'Без свёртки',
  args: { groupSimilar: false },
};

export const OldestFirst: Story = {
  name: 'Старые сверху',
  args: { order: 'asc' },
};
