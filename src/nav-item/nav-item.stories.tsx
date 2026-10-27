import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hash, Settings, Volume2 } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Avatar, Icon, IconButton, NavItem, Surface } from '@haunt/ui';

const meta = {
  title: 'Списки/NavItem',
  component: NavItem,
  tags: ['autodocs'],
  args: {
    children: 'general',
    icon: <Icon icon={Hash} />,
    onClick: fn(),
  },
  argTypes: {
    icon: { control: false },
    description: { control: 'text' },
    actions: { control: false },
    as: { control: false },
  },
  decorators: [
    (Story) => (
      <Surface level={2} panel style={{ width: 240, padding: 'var(--space-1)' }}>
        <Story />
      </Surface>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Строка списка каналов (28 px) или участников (32 px). Счётчик непрочитанных, упоминание, приглушённое состояние, действия по наведению. С `activeLayoutId` подсветка активной строки переезжает между строками одного списка.',
      },
    },
  },
} satisfies Meta<typeof NavItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'general' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Active: Story = {
  args: { active: true },
  play: async ({ canvasElement }) => {
    const item = within(canvasElement).getByRole('button', { name: 'general' });

    await expect(item).toHaveAttribute('aria-current', 'page');
    await expect(item).toHaveAttribute('data-active', 'true');
  },
};

export const Unread: Story = {
  args: { children: 'design', unread: 12 },
};

export const Mention: Story = {
  args: { children: 'rust', unread: 2, mention: true },
};

export const ManyUnread: Story = {
  args: { children: 'flood', unread: 240 },
};

export const HasUnreadWithoutCount: Story = {
  args: { children: 'news', hasUnread: true },
};

export const Muted: Story = {
  args: { children: 'random', muted: true },
};

export const WithActions: Story = {
  args: {
    actions: (
      <IconButton label="Настройки канала" size="xs">
        <Icon icon={Settings} size="xs" />
      </IconButton>
    ),
  },
};

export const VoiceChannel: Story = {
  args: { icon: <Icon icon={Volume2} />, children: 'Общий', description: '2 в канале' },
};

export const Member: Story = {
  args: {
    density: 'default',
    icon: <Avatar name="Мария Орлова" size="sm" status="online" />,
    children: 'Мария Орлова',
    description: 'владелец',
  },
};

export const OfflineMember: Story = {
  args: {
    density: 'default',
    icon: <Avatar name="Иван Лебедев" size="sm" status="offline" />,
    children: 'Иван Лебедев',
    muted: true,
  },
};

export const LongName: Story = {
  args: { children: 'rust-и-очень-длинное-название-канала-которое-обрежется', unread: 3 },
};

export const AsLink: Story = {
  args: { href: '#general', children: 'general' },
};

function ChannelList() {
  const [active, setActive] = useState('general');

  return (
    <>
      {['general', 'design', 'rust'].map((name) => (
        <NavItem
          key={name}
          icon={<Icon icon={Hash} />}
          active={active === name}
          activeLayoutId="story-channels"
          onClick={() => setActive(name)}
        >
          {name}
        </NavItem>
      ))}
    </>
  );
}

/** Подсветка переезжает между строками (Motion layoutId), `aria-current` — у выбранной */
export const SwitchingList: Story = {
  render: () => <ChannelList />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'design' }));

    await expect(canvas.getByRole('button', { name: 'design' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(canvas.getByRole('button', { name: 'general' })).not.toHaveAttribute(
      'aria-current',
    );
  },
};
