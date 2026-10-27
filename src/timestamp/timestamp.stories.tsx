import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Avatar, Inline, Stack, Text, Timestamp } from '@haunt/ui';

import { expectVisible, screen } from '../lib/stories/play-helpers';

const MINUTE = 60_000;

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * MINUTE);
}

function daysAgoAt(days: number, hours: number, minutes: number): Date {
  const date = new Date();

  date.setDate(date.getDate() - days);
  date.setHours(hours, minutes, 0, 0);

  return date;
}

const meta = {
  title: 'Текст/Timestamp',
  component: Timestamp,
  tags: ['autodocs'],
  args: { date: minutesAgo(5), mode: 'relative', locale: 'ru', live: true, tooltip: true },
  argTypes: {
    date: { control: 'date' },
    mode: { control: 'inline-radio', options: ['relative', 'time', 'date'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Время в `<time dateTime>`, моно с табличными цифрами. Относительное — «сейчас», «5 мин», «3 ч», «вчера в 12:40», дата — на `Intl` (`locale`, по умолчанию `ru`). Обновляется само: пока в подписи минуты — раз в 30 с, часы — раз в 5 мин, «вчера» — в полночь; все экземпляры делят **один** таймер. Точное время — в подсказке. Цвет наследуется.',
      },
    },
  },
} satisfies Meta<typeof Timestamp>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const time = canvasElement.querySelector('time');

    await expect(time).toHaveTextContent('5 мин');
    await expect(time?.getAttribute('dateTime')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  },
};

export const Scale: Story = {
  name: 'Шкала относительного времени',
  render: (args) => (
    <Stack gap={1}>
      {[
        ['сейчас', new Date()],
        ['5 минут назад', minutesAgo(5)],
        ['3 часа назад', minutesAgo(180)],
        ['вчера', daysAgoAt(1, 12, 40)],
        ['в этом году', daysAgoAt(40, 9, 0)],
        ['давно', daysAgoAt(500, 9, 0)],
        ['через 10 минут', minutesAgo(-10)],
      ].map(([caption, date]) => (
        <Inline key={caption as string} gap={3}>
          <Text size="sm" tone="subtle" style={{ width: 120 }}>
            {caption as string}
          </Text>

          <Text size="sm">
            <Timestamp {...args} date={date as Date} />
          </Text>
        </Inline>
      ))}
    </Stack>
  ),
};

export const Modes: Story = {
  name: 'Режимы',
  args: { date: daysAgoAt(1, 12, 40) },
  render: (args) => (
    <Inline gap={4}>
      <Timestamp {...args} mode="relative" />
      <Timestamp {...args} mode="time" />
      <Timestamp {...args} mode="date" />
    </Inline>
  ),
};

export const English: Story = {
  args: { locale: 'en', date: daysAgoAt(1, 12, 40) },
};

export const InMessage: Story = {
  name: 'В шапке сообщения',
  render: (args) => (
    <Inline gap={2} align="start">
      <Avatar name="Мария Орлова" size="md" />

      <Stack gap={0.5}>
        <Inline gap={2} align="baseline">
          <Text weight="semibold">Мария Орлова</Text>

          <Text size="xs" tone="subtle">
            <Timestamp {...args} />
          </Text>
        </Inline>

        <Text size="lg">Созвон перенесли на пять, ссылка та же.</Text>
      </Stack>
    </Inline>
  ),
};

export const Invalid: Story = {
  name: 'Неверная дата',
  args: { date: 'не дата' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('time')).toHaveTextContent('—');
  },
};

export const ExactTimeTooltip: Story = {
  name: 'Точное время в подсказке',
  args: { date: daysAgoAt(1, 12, 40) },
  play: async ({ canvasElement }) => {
    const time = within(canvasElement).getByText(/вчера в 12:40/);

    await userEvent.hover(time);
    await expectVisible(await screen().findByRole('tooltip'));
    await expect(screen().getByRole('tooltip')).toHaveTextContent(/12:40:00/);
  },
};
