import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  Button,
  ReactionBar,
  ReactionPicker,
  toggleReaction,
  type ReactionBarProps,
  type ReactionItem,
} from '@haunt/ui';

import {
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

const initial: ReactionItem[] = [
  {
    emoji: '🔥',
    name: 'огонь',
    count: 5,
    mine: true,
    users: ['Мария', 'Олег', 'Ада', 'Лев', 'Ира'],
  },
  { emoji: '👍', name: 'нравится', count: 12, users: ['Олег', 'Ада', 'Лев'] },
  { emoji: '😂', name: 'смех', count: 1, users: ['Ира'] },
];

/** Реакции со своим состоянием — так, как экран обновляет их оптимистично через toggleReaction */
function LiveReactionBar(
  props: Omit<ReactionBarProps, 'reactions'> & { reactions?: ReactionItem[] },
) {
  const [reactions, setReactions] = useState(props.reactions ?? initial);

  return (
    <ReactionBar
      {...props}
      reactions={reactions}
      onToggle={(emoji, mine) => {
        props.onToggle?.(emoji, mine);
        setReactions((current) => toggleReaction(current, emoji, mine));
      }}
      onAdd={(emoji) => {
        props.onAdd?.(emoji);
        setReactions((current) => toggleReaction(current, emoji, true));
      }}
    />
  );
}

const meta = {
  title: 'Сообщество/ReactionBar',
  component: LiveReactionBar,
  subcomponents: { ReactionBar, ReactionPicker },
  tags: ['autodocs'],
  args: { onToggle: fn(), onAdd: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Реакции под сообщением: `Chip` со счётчиком, своя — выбранным тоном (`aria-pressed`), при добавлении — «поп» и всплеск (и у новой реакции). Подсказка «кто поставил» — `Tooltip`, по наведению и фокусу. «+» открывает `ReactionPicker`: частые быстрым рядом (стрелки, Home / End), под ним полный `EmojiPicker`. Выбранная повторно реакция не дублируется. `toggleReaction` — чистая функция для оптимистичного обновления.',
      },
    },
  },
} satisfies Meta<typeof LiveReactionBar>;

export default meta;

type Story = StoryObj<typeof meta>;

const chip = (canvas: HTMLElement, name: RegExp) => within(canvas).getByRole('button', { name });

export const Default: Story = {};

export const Toggle: Story = {
  name: 'Поставить и снять',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(chip(canvasElement, /^нравится: 12$/));
    await expect(args.onToggle).toHaveBeenCalledWith('👍', true);

    const liked = chip(canvasElement, /^нравится: 13, вы поставили$/);

    await expect(liked).toHaveAttribute('aria-pressed', 'true');
    // Всплеск — реакция на смену selected false → true
    await expect(liked).toHaveAttribute('data-pop');

    await userEvent.click(chip(canvasElement, /^огонь: 5, вы поставили$/));
    await expect(chip(canvasElement, /^огонь: 4$/)).toHaveAttribute('aria-pressed', 'false');
  },
};

export const Keyboard: Story = {
  name: 'Клавиатура и подсказка «кто поставил»',
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(chip(canvasElement, /^огонь/)).toHaveFocus();
    await waitFor(() =>
      expect(screen().getByRole('tooltip')).toHaveTextContent('Мария, Олег, Ада, Лев, Ира'),
    );

    await userEvent.keyboard(' ');
    await expect(chip(canvasElement, /^огонь: 4$/)).toBeInTheDocument();
  },
};

export const WhoTruncated: Story = {
  name: 'Подсказка: и ещё N',
  args: { namesLimit: 2 },
  play: async ({ canvasElement }) => {
    await userEvent.hover(chip(canvasElement, /^нравится/));
    await waitFor(() =>
      expect(screen().getByRole('tooltip')).toHaveTextContent('Олег, Ада и ещё 10'),
    );
  },
};

export const AddFromQuickRow: Story = {
  name: 'Новая реакция из быстрого ряда',
  play: async ({ args, canvasElement }) => {
    const add = within(canvasElement).getByRole('button', { name: 'Добавить реакцию' });

    await userEvent.click(add);

    const row = await screen().findByRole('toolbar', { name: 'Частые реакции' });

    await expectVisible(row);
    await expectFocused(within(row).getByRole('button', { name: '👍' }));

    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    await expect(within(row).getByRole('button', { name: '😮' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    await expect(args.onAdd).toHaveBeenCalledWith('😮');
    await expectGone(() => screen().queryByRole('toolbar', { name: 'Частые реакции' }));
    await waitFor(() =>
      expect(chip(canvasElement, /^😮: 1, вы поставили$/)).toHaveAttribute('data-pop'),
    );
    await expectFocused(add);
  },
};

export const PickExisting: Story = {
  name: 'Уже стоящая — не дублируется',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Добавить реакцию' }));
    await userEvent.click(await screen().findByRole('button', { name: '😂' }));

    await expect(args.onAdd).not.toHaveBeenCalled();
    await expect(args.onToggle).toHaveBeenCalledWith('😂', true);
    await expect(within(canvasElement).getAllByRole('button', { name: /^смех/ })).toHaveLength(1);
  },
};

export const PickerEscape: Story = {
  name: 'Пикер закрывается по Esc',
  play: async ({ canvasElement }) => {
    const add = within(canvasElement).getByRole('button', { name: 'Добавить реакцию' });

    await userEvent.click(add);
    await expectVisible(await screen().findByRole('dialog', { name: 'Выбор реакции' }));
    await pressEscape();
    await expectGone(() => screen().queryByRole('dialog', { name: 'Выбор реакции' }));
    await expectFocused(add);
  },
};

export const Small: Story = { name: 'Малые', args: { size: 'sm' } };

export const Disabled: Story = {
  name: 'Только чтение',
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole('button', { name: 'Добавить реакцию' }),
    ).toBeNull();
    await expect(chip(canvasElement, /^огонь/)).toBeDisabled();
  },
};

export const Empty: Story = { name: 'Без реакций — только «+»', args: { reactions: [] } };

/** Быстрый ряд без полного пикера — для наведения на сообщение */
function QuickOnly() {
  const [last, setLast] = useState<string>();

  return (
    <>
      <ReactionPicker full={false} onSelect={setLast} side="bottom">
        <Button size="sm">Реакция</Button>
      </ReactionPicker>{' '}
      {last}
    </>
  );
}

export const QuickRowOnly: Story = {
  name: 'ReactionPicker: только быстрый ряд',
  render: () => <QuickOnly />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Реакция' }));
    await userEvent.keyboard('{End}{Enter}');
    await expect(within(canvasElement).getByText('🔥')).toBeInTheDocument();
  },
};
