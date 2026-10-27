import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button, EventCard, type AvatarGroupItem, type EventRsvp } from '@haunt/ui';

import { photos } from '../lib/stories/demo-photos';

const people: AvatarGroupItem[] = [
  'Мария Орлова',
  'Олег Петров',
  'Ада Лавлейс',
  'Лев Котов',
  'Ира Белова',
  'Гоша',
].map((name) => ({ name }));

const start = '2026-11-14T19:00:00Z';
const end = '2026-11-14T21:30:00Z';

const meta = {
  title: 'Сообщество/EventCard',
  component: EventCard,
  tags: ['autodocs'],
  args: {
    title: 'Ночной рейд: голосовой созвон и разбор',
    start,
    end,
    location: 'Голосовая · Штаб',
    locationKind: 'voice',
    attendees: people,
    attendeeCount: 24,
    timeZone: 'UTC',
    now: new Date('2026-11-10T12:00:00Z'),
    onRsvpChange: fn(),
  },
  argTypes: { attendees: { control: false }, now: { control: false }, actions: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Событие: плитка даты (день крупно — дисплейным шрифтом в «сигнале»), время и длительность, место с иконкой вида (голосовой канал, сцена, место, ссылка), участники `AvatarGroup`, «Пойду / Может быть» — `ToggleGroup` (повторное нажатие снимает ответ), обложка — `cover` при `showCover`. Идущее — пометка «Идёт сейчас», у завершённого ответа нет. `now` и `timeZone` — для историй и событий в чужом поясе. Логика времени — `event-time.ts`.',
      },
    },
  },
} satisfies Meta<typeof EventCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Upcoming: Story = {
  name: 'Скоро',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('14')).toBeInTheDocument();
    await expect(canvas.getByText('19:00–21:30')).toBeInTheDocument();
    await expect(canvas.getByText('2 ч 30 мин')).toBeInTheDocument();
    await expect(canvas.getAllByText('24 участника').length).toBeGreaterThan(0);
  },
};

/** Ответ со своим состоянием */
function Rsvp() {
  const [rsvp, setRsvp] = useState<EventRsvp>(null);

  return (
    <EventCard
      title="Ночной рейд"
      start={start}
      end={end}
      timeZone="UTC"
      now={new Date('2026-11-10T12:00:00Z')}
      attendees={people}
      rsvp={rsvp}
      onRsvpChange={setRsvp}
    />
  );
}

export const Answer: Story = {
  name: 'Пойду / может быть / снять',
  render: () => <Rsvp />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const going = canvas.getByRole('radio', { name: 'Пойду' });

    await userEvent.click(going);
    await expect(going).toHaveAttribute('aria-checked', 'true');

    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('radio', { name: 'Может быть' })).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(canvas.getByRole('radio', { name: 'Может быть' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await userEvent.keyboard(' ');
    await expect(canvas.getByRole('radio', { name: 'Может быть' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  },
};

export const Live: Story = {
  name: 'Идёт сейчас',
  args: { now: new Date('2026-11-14T20:00:00Z'), rsvp: 'going' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Идёт сейчас')).toBeInTheDocument();
  },
};

export const Ended: Story = {
  name: 'Завершено',
  args: { now: new Date('2026-11-15T00:00:00Z') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Завершено')).toBeInTheDocument();
    await expect(canvas.queryByRole('radio', { name: 'Пойду' })).toBeNull();
  },
};

export const WithCover: Story = {
  name: 'С обложкой',
  args: {
    cover: photos.clouds.src,
    description: 'Разбираем прошлый рейд и планируем следующий. Микрофон обязателен.',
    locationKind: 'stage',
    location: 'Сцена · Главная',
    actions: (
      <Button size="sm" variant="ghost">
        Подробнее
      </Button>
    ),
  },
};

export const CoverHidden: Story = {
  name: 'Обложка выключена флагом',
  args: { cover: photos.clouds.src, showCover: false },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('img[src^="data:"]')).toBeNull();
  },
};

export const NoEnd: Story = {
  name: 'Без конца и участников',
  args: {
    end: undefined,
    attendees: undefined,
    attendeeCount: undefined,
    onRsvpChange: undefined,
    locationKind: 'place',
    location: 'Кафе «Призрак», Невский 12',
  },
};
