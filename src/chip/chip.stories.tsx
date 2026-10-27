import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Chip, Inline } from '@haunt/ui';

const meta = {
  title: 'Отображение/Chip',
  component: Chip,
  tags: ['autodocs'],
  args: { children: 'фильтр', size: 'md', onClick: fn() },
  argTypes: {
    icon: { control: false },
    children: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Нажимаемая таблетка: реакция под сообщением, фильтр, тег. При включении (`selected` false → true) «попает» и даёт всплеск частиц, смена `count` въезжает снизу. Эффекты гаснут при `data-effects="off"`.',
      },
    },
  },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: { selected: true, children: 'выбранный' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  },
};

export const Reaction: Story = {
  args: { icon: '🔥', count: 12, children: undefined },
};

export const Small: Story = {
  args: { icon: '❤️', count: 7, size: 'sm', children: undefined },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'выключен' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button')).toBeDisabled();
  },
};

export const LongText: Story = {
  args: { size: 'sm', children: 'очень длинное название тега, которое обрежется' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 180 }}>
        <Story />
      </div>
    ),
  ],
};

/** Реакции под сообщением: клик ставит и снимает свою, счётчик меняется */
export const Toggling: Story = {
  render: function TogglingStory() {
    const [reactions, setReactions] = useState([
      { emoji: '🔥', count: 12, mine: false },
      { emoji: '👀', count: 3, mine: true },
    ]);

    const toggle = (emoji: string) =>
      setReactions((current) =>
        current.map((reaction) =>
          reaction.emoji === emoji
            ? {
                ...reaction,
                mine: !reaction.mine,
                count: reaction.count + (reaction.mine ? -1 : 1),
              }
            : reaction,
        ),
      );

    return (
      <Inline gap={1}>
        {reactions.map((reaction) => (
          <Chip
            key={reaction.emoji}
            icon={reaction.emoji}
            count={reaction.count}
            selected={reaction.mine}
            onClick={() => toggle(reaction.emoji)}
          />
        ))}
      </Inline>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fire = canvas.getByRole('button', { name: /🔥\s*12/ });

    await expect(fire).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(fire);

    await expect(canvas.getByRole('button', { name: /🔥\s*13/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(canvas.getByRole('button', { name: /👀\s*3/ }));

    await expect(canvas.getByRole('button', { name: /👀\s*2/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
};
