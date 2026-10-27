import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';

import { Countdown, Stack, type CountdownProps } from '@haunt/ui';

const now = '2026-11-14T16:44:51Z';
const at = '2026-11-16T19:00:00Z';

const meta = {
  title: 'Сообщество/Countdown',
  component: Countdown,
  tags: ['autodocs'],
  args: { to: at, now, label: 'До начала рейда' },
  argTypes: { to: { control: false }, now: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Обратный отсчёт до события: единицы — `units`, ведущие нули убираются (`trim`). Таймер ставится ровно на смену показа (`nextTick`), без секунд — раз в минуту. `variant="flap"` — табло `SplitFlap` из `fx/effects` (язык стиля «сигнал»); при `data-effects="off"` и reduced-motion флажки не перекидываются. Скринридер читает словами («2 дня 2 часа…»), `role="timer"`. `now` — замороженное время для историй. Разбивка — `countdown-math.ts`.',
      },
    },
  },
} satisfies Meta<typeof Countdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  name: 'Цифры',
  play: async ({ canvasElement }) => {
    const timer = within(canvasElement).getByRole('timer', { name: 'До начала рейда' });

    await expect(timer).toHaveTextContent('2 дня 2 часа 15 минут 9 секунд');
  },
};

export const NoSeconds: Story = {
  name: 'Без секунд',
  args: { units: ['days', 'hours', 'minutes'] },
};

export const Flap: Story = { name: 'Табло', args: { variant: 'flap' } };

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <Stack gap={4}>
      <Countdown {...args} size="sm" />
      <Countdown {...args} />
      <Countdown {...args} size="lg" />
    </Stack>
  ),
};

/** Цель — через 2,5 с от монтирования: момент берётся один раз, а не на каждый рендер */
function Soon(props: Omit<CountdownProps, 'to'>) {
  const [to] = useState(() => Date.now() + 2500);

  return <Countdown {...props} to={to} />;
}

export const Live: Story = {
  name: 'Идёт, до конца — секунды',
  args: { now: undefined, onComplete: fn(), doneLabel: 'Рейд начался' },
  render: ({ to: _to, ...args }) => <Soon {...args} />,
  play: async ({ args, canvasElement }) => {
    const timer = within(canvasElement).getByRole('timer');

    await expect(timer).toHaveTextContent(/0 минут [23] секунды/);
    await waitFor(() => expect(timer).toHaveTextContent('Рейд начался'), { timeout: 4000 });
    // onComplete — из эффекта, он выполняется после отрисовки текста
    await waitFor(() => expect(args.onComplete).toHaveBeenCalledTimes(1));
  },
};

export const Done: Story = {
  name: 'Время вышло',
  args: { to: '2026-11-14T10:00:00Z' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('timer')).toHaveTextContent('Началось');
  },
};
