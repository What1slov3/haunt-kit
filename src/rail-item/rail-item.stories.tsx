import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Compass, Inbox, Plus } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Avatar, Divider, Icon, RailItem, Surface } from '@haunt/ui';

import { expectVisible, screen } from '../lib/stories/play-helpers';

const meta = {
  title: 'Списки/RailItem',
  component: RailItem,
  tags: ['autodocs'],
  args: {
    label: 'Котики',
    children: <Avatar name="Котики" shape="rounded" size="lg" />,
    onClick: fn(),
  },
  argTypes: {
    children: { control: false },
    unread: { control: 'object' },
  },
  decorators: [
    (Story) => (
      <Surface
        level={1}
        panel
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
          width: 56,
          padding: 'var(--space-2) 0',
        }}
      >
        <Story />
      </Surface>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Пункт рейла пространств: плитка 40×40, индикатор слева (непрочитанное — точка, активное — полоса), счётчик в углу. Название — в подсказке справа и в `aria-label`.',
      },
    },
  },
} satisfies Meta<typeof RailItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const item = within(canvasElement).getByRole('button', { name: 'Котики' });

    await userEvent.hover(item);
    await expectVisible(await screen().findByRole('tooltip', { name: 'Котики' }));

    await userEvent.click(item);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Active: Story = {
  args: { active: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Котики' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

export const Unread: Story = {
  args: { unread: true },
};

export const UnreadCount: Story = {
  args: {
    label: 'Личные сообщения',
    variant: 'accent',
    unread: 3,
    children: <Icon icon={Inbox} />,
  },
};

export const ManyUnread: Story = {
  args: { unread: 150 },
};

export const Ghost: Story = {
  args: { label: 'Создать сообщество', variant: 'ghost', children: <Icon icon={Plus} /> },
};

export const Profile: Story = {
  args: {
    label: 'Профиль',
    variant: 'plain',
    children: <Avatar name="Я" size="lg" status="online" />,
  },
};

function Rail() {
  const [active, setActive] = useState(1);

  return (
    <>
      <RailItem
        label="Личные сообщения"
        variant="accent"
        active={active === 0}
        unread={3}
        onClick={() => setActive(0)}
      >
        <Icon icon={Inbox} />
      </RailItem>

      <Divider style={{ width: 24, alignSelf: 'center' }} />

      {['Haunt', 'Котики', 'Rust'].map((name, index) => (
        <RailItem
          key={name}
          label={name}
          active={active === index + 1}
          unread={index === 1}
          onClick={() => setActive(index + 1)}
        >
          <Avatar name={name} shape="rounded" size="lg" />
        </RailItem>
      ))}

      <RailItem label="Исследовать" variant="ghost">
        <Icon icon={Compass} />
      </RailItem>

      <RailItem label="Профиль" variant="plain">
        <Avatar name="Я" size="lg" status="online" />
      </RailItem>
    </>
  );
}

/** Рейл целиком: выбор пространства переключает `aria-pressed` */
export const FullRail: Story = {
  render: () => <Rail />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Rust' }));

    await expect(canvas.getByRole('button', { name: 'Rust' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Haunt' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
};
