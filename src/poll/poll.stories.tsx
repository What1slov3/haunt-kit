import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Poll, type PollOption, type PollProps } from '@haunt/ui';

const options: PollOption[] = [
  { id: 'rust', label: 'Rust', votes: 14, emoji: '🦀' },
  { id: 'go', label: 'Go', votes: 9, emoji: '🐹' },
  { id: 'ts', label: 'TypeScript везде', votes: 6, emoji: '🟦' },
];

const inHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

/** Опрос со своим состоянием голоса — как экран держит его до ответа сервера */
function LivePoll(props: Partial<PollProps>) {
  const [state, setState] = useState({
    votedFor: props.votedFor ?? [],
    options: props.options ?? options,
  });

  return (
    <Poll
      question="На чём писать сервер голосовых комнат?"
      {...props}
      options={state.options}
      votedFor={state.votedFor}
      onVote={(ids) => {
        props.onVote?.(ids);
        setState((current) => ({
          votedFor: ids,
          options: current.options.map((option) =>
            ids.includes(option.id) ? { ...option, votes: option.votes + 1 } : option,
          ),
        }));
      }}
      onRetract={() =>
        setState((current) => ({
          votedFor: [],
          options: current.options.map((option) =>
            current.votedFor.includes(option.id) ? { ...option, votes: option.votes - 1 } : option,
          ),
        }))
      }
    />
  );
}

const meta = {
  title: 'Сообщество/Poll',
  component: LivePoll,
  subcomponents: { Poll },
  tags: ['autodocs'],
  args: { onVote: fn(), endsAt: inHour() },
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
          'Опрос: вопрос, варианты — родные радио (один) или флажки (несколько, `maxChoices`), «Голосовать». После голоса и по завершении — полосы итогов с процентами (наибольшим остатком: в сумме ровно 100; при множественном выборе с `voters` — от людей), «ваш голос» галочкой, у завершённого — лидер. Анонимность — пометка, таймер — живой `Timestamp`. Клавиатура — стрелки у радио, пробел у флажков, Tab к кнопке.',
      },
    },
  },
} satisfies Meta<typeof LivePoll>;

export default meta;

type Story = StoryObj<typeof meta>;

const total = (results: HTMLElement[]) =>
  results.reduce((sum, item) => sum + Number(item.textContent?.match(/(\d+)%$/)?.[1] ?? 0), 0);

export const VoteSingle: Story = {
  name: 'Голос: один вариант',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const vote = canvas.getByRole('button', { name: 'Голосовать' });

    await expect(vote).toBeDisabled();
    await userEvent.click(canvas.getByRole('radio', { name: /Go/ }));
    await userEvent.click(vote);
    await expect(args.onVote).toHaveBeenCalledWith(['go']);

    const results = canvas.getAllByRole('listitem');

    await expect(results[1]).toHaveAccessibleName('Go: 33%, 10 голосов, ваш голос');
    await expect(total(results)).toBe(100);
    await expect(canvas.getByText('Вы проголосовали')).toBeInTheDocument();
  },
};

export const Keyboard: Story = {
  name: 'Голос с клавиатуры',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: /Rust/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('radio', { name: /Go/ })).toBeChecked();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Голосовать' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onVote).toHaveBeenCalledWith(['go']);
  },
};

export const Multiple: Story = {
  name: 'Несколько вариантов, не больше двух',
  args: {
    multiple: true,
    maxChoices: 2,
    options: [...options, { id: 'zig', label: 'Zig', votes: 2, emoji: '⚡' }],
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('До 2 вариантов')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('checkbox', { name: /Rust/ }));
    await userEvent.click(canvas.getByRole('checkbox', { name: /Zig/ }));
    await expect(canvas.getByRole('checkbox', { name: /Go/ })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Голосовать' }));
    await expect(args.onVote).toHaveBeenCalledWith(['rust', 'zig']);
  },
};

export const Retract: Story = {
  name: 'Отменить голос',
  args: { votedFor: ['rust'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Отменить голос' }));
    await expect(canvas.getByRole('radio', { name: /Rust/ })).not.toBeChecked();
  },
};

export const Closed: Story = {
  name: 'Завершён',
  args: { closed: true, endsAt: '2026-10-20T12:40:00Z', votedFor: ['go'], anonymous: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByRole('button', { name: 'Голосовать' })).toBeNull();
    await expect(canvas.getAllByRole('listitem')[0]).toHaveAttribute('data-leading');
    await expect(canvas.getByText('Анонимный')).toBeInTheDocument();
  },
};

export const ResultsBeforeVote: Story = {
  name: 'Итоги видны до голоса',
  args: { showResults: true },
};

export const Empty: Story = {
  name: 'Ещё никто не голосовал',
  args: { options: options.map((option) => ({ ...option, votes: 0 })), showResults: true },
};
