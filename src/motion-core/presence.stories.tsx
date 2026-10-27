import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Button, Callout, Presence, Stack, type PresenceProps } from '@haunt/ui';

import { expectGone } from '../lib/stories/play-helpers';

function Toggle(props: Omit<PresenceProps, 'present' | 'children'>) {
  const [open, setOpen] = useState(true);

  return (
    <Stack gap={3} align="start" style={{ width: 340 }}>
      <Button size="sm" onClick={() => setOpen((current) => !current)}>
        {open ? 'Скрыть' : 'Показать'}
      </Button>

      <Presence {...props} present={open}>
        <Callout title="Новое в пространстве">Канал «эфир» открыт для всех участников.</Callout>
      </Presence>
    </Stack>
  );
}

const meta = {
  title: 'Движение/Presence',
  component: Presence,
  tags: ['autodocs'],
  args: { present: true, animation: 'pop', children: null, onExitComplete: fn() },
  argTypes: {
    animation: { control: 'inline-radio', options: ['fade', 'pop', 'rise', 'slide-right', 'none'] },
    children: { control: false },
    present: { control: false },
  },
  render: ({ present: _present, children: _children, ...args }) => <Toggle {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'Монтирование с анимацией ухода на CSS, без Motion: при `present = false` элемент получает `data-state="closed"`, играет уход и размонтируется по `animationend`; страховка — таймер из вычисленной длительности (keyframes не нашлись, вкладка в фоне). Встроенные пары — на `--anim-*`; `animation="none"` + `asChild` — своя анимация в CSS ребёнка по `data-state`. Пример: уход тоста, баннера, строки списка вместе с `useFlipList`.',
      },
    },
  },
} satisfies Meta<typeof Presence>;

export default meta;

type Story = StoryObj<typeof meta>;

const presence = (canvasElement: HTMLElement) => canvasElement.querySelector('[data-state]');

export const UnmountsAfterExit: Story = {
  name: 'Размонтирует после ухода',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(presence(canvasElement)).toHaveAttribute('data-state', 'open');
    await userEvent.click(canvas.getByRole('button', { name: 'Скрыть' }));
    // Сразу после клика элемент ещё в DOM — играет уход
    await expect(presence(canvasElement)).toHaveAttribute('data-state', 'closed');
    await expectGone(() => presence(canvasElement));
    await expect(args.onExitComplete).toHaveBeenCalledTimes(1);

    await userEvent.click(canvas.getByRole('button', { name: 'Показать' }));
    await waitFor(() => expect(presence(canvasElement)).toHaveAttribute('data-state', 'open'));
  },
};

export const Rise: Story = { name: 'Подъём и уход вниз', args: { animation: 'rise' } };

export const SlideRight: Story = { name: 'Въезд справа', args: { animation: 'slide-right' } };

export const ReshowDuringExit: Story = {
  name: 'Показан снова во время ухода',
  args: { animation: 'fade' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Скрыть' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Показать' }));
    await expect(presence(canvasElement)).toHaveAttribute('data-state', 'open');
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(presence(canvasElement)).toBeInTheDocument();
  },
};

/** Ребёнок без анимации ухода: снимается сразу, а не ждёт события, которого не будет */
export const NoAnimation: Story = {
  name: 'Без анимации — сразу',
  args: { animation: 'none' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Скрыть' }));
    await waitFor(() => expect(presence(canvasElement)).toBeNull(), { timeout: 100 });
  },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — всё так же размонтирует',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Скрыть' }));
    await expectGone(() => presence(canvasElement));
  },
};
