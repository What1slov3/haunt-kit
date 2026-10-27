import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CalendarView, UiStringsProvider, type CalendarViewEvent } from '@haunt/ui';

import { chartFrame } from '../lib/stories/data-frame';

const events: CalendarViewEvent[] = [
  { id: 'jam', title: 'Геймджем', start: '2026-10-20', end: '2026-10-23', tone: 'accent' },
  { id: 'trip', title: 'Выезд на конвент', start: '2026-10-29', end: '2026-11-02', tone: 'info' },
  {
    id: 'raid',
    title: 'Рейд',
    start: '2026-10-23',
    startTime: '20:00',
    endTime: '22:30',
    tone: 'danger',
  },
  {
    id: 'standup',
    title: 'Созвон модераторов',
    start: '2026-10-21',
    startTime: '10:00',
    endTime: '10:30',
  },
  {
    id: 'review',
    title: 'Разбор заявок',
    start: '2026-10-21',
    startTime: '10:15',
    endTime: '11:30',
    tone: 'warning',
  },
  {
    id: 'stream',
    title: 'Стрим',
    start: '2026-10-21',
    startTime: '11:00',
    endTime: '12:00',
    tone: 'success',
  },
  {
    id: 'movie',
    title: 'Кино-вечер',
    start: '2026-10-21',
    startTime: '19:00',
    endTime: '21:00',
    tone: 'info',
  },
  { id: 'quiz', title: 'Квиз', start: '2026-10-21', startTime: '21:30', tone: 'neutral' },
  { id: 'bday', title: 'День рождения пространства', start: '2026-10-26', tone: 'success' },
  {
    id: 'vote',
    title: 'Голосование за правила',
    start: '2026-10-05',
    end: '2026-10-09',
    tone: 'warning',
  },
];

const meta = {
  title: 'Данные/CalendarView',
  component: CalendarView,
  tags: ['autodocs'],
  args: {
    events,
    today: '2026-10-26',
    defaultDate: '2026-10-21',
    onDayClick: fn(),
    onEventClick: fn(),
    onDateChange: fn(),
  },
  argTypes: { events: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ ...chartFrame, maxWidth: 900 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Экран событий (решение 0008): месяц и неделя. Многодневные и «весь день» — полосой через дни, у продолжения за неделю — прямой край. Не влезло в ячейку — «ещё N» (`maxEventsPerDay`). В неделе события со временем — колонками там, где пересекаются; у всей цепочки пересечений одна ширина. Сегодня — заливка акцента. Дни ходят стрелками, PageUp / PageDown — месяц. Даты — `IsoDate`, раскладка — чистые функции `calendar-view-layout.ts`.',
      },
    },
  },
} satisfies Meta<typeof CalendarView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Month: Story = {
  name: 'Месяц',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: 'Октябрь 2026 г.' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /ещё 3/i }));
    await expect(args.onDayClick).toHaveBeenCalledWith('2026-10-21');
    await userEvent.click(canvas.getByRole('button', { name: 'Геймджем' }));
    await expect(args.onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'jam' }));
  },
};

export const Week: Story = {
  name: 'Неделя',
  args: { defaultView: 'week' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const review = canvas.getByRole('button', { name: /Разбор заявок/ });
    const standup = canvas.getByRole('button', { name: /Созвон модераторов/ });

    // Пересекаются — стоят рядом, а не друг на друге
    await expect(review.getBoundingClientRect().left).toBeGreaterThan(
      standup.getBoundingClientRect().left,
    );
    await expect(canvas.getByText('Весь день')).toBeInTheDocument();
  },
};

export const Navigation: Story = {
  name: 'Навигация',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Следующий месяц' }));
    await expect(canvas.getByRole('heading', { name: 'Ноябрь 2026 г.' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Сегодня' }));
    await expect(args.onDateChange).toHaveBeenLastCalledWith('2026-10-26');
    await userEvent.click(canvas.getByRole('radio', { name: 'Неделя' }));
    await expect(canvas.getByRole('button', { name: 'Следующая неделя' })).toBeInTheDocument();
  },
};

export const Keyboard: Story = {
  name: 'Клавиатура по дням',
  play: async ({ canvasElement }) => {
    const day = canvasElement.querySelector<HTMLElement>('[data-day="2026-10-21"]')!;

    day.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvasElement.querySelector('[data-day="2026-10-22"]')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvasElement.querySelector('[data-day="2026-10-29"]')).toHaveFocus();
  },
};

export const English: Story = {
  name: 'Локаль en-US',
  render: (args) => (
    <UiStringsProvider locale="en-US">
      <CalendarView {...args} defaultView="week" />
    </UiStringsProvider>
  ),
};
