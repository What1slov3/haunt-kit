import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pencil, Share2 } from 'lucide-react';
import { expect, within } from 'storybook/test';

import { ArtifactHeader, Avatar, Icon, IconButton, Link, ProfileHoverCard } from '@haunt/ui';

import { maria } from '../lib/stories/demo-space';

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

const meta = {
  title: 'Сообщество/ArtifactHeader',
  component: ArtifactHeader,
  tags: ['autodocs'],
  args: {
    kind: 'Решение',
    title: 'Шапки и лейауты страниц: что берём в кит',
    author: (
      <ProfileHoverCard {...maria} side="bottom">
        <Link href="#maria" tone="inherit">
          <Avatar name={maria.name} size="xs" /> {maria.name}
        </Link>
      </ProfileHoverCard>
    ),
    place: <Link href="#design">#дизайн</Link>,
    date: hoursAgo(30),
    updatedAt: hoursAgo(2),
    origin: <Link href="#thread">#дизайн</Link>,
    tags: ['кит', 'вёрстка'],
    actions: (
      <>
        <IconButton label="Редактировать" size="sm" variant="ghost">
          <Icon icon={Pencil} size="sm" />
        </IconButton>

        <IconButton label="Поделиться" size="sm" variant="ghost">
          <Icon icon={Share2} size="sm" />
        </IconButton>
      </>
    ),
  },
  argTypes: {
    author: { control: false },
    place: { control: false },
    origin: { control: false },
    actions: { control: false },
    date: { control: false },
    updatedAt: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Шапка артефакта или поста: метка вида (`kind`), заголовок страницы, строка «автор · место · когда (изменено)», откуда собран (`origin` — артефакт кристаллизуется из обсуждения в потоке, связь с источником видна сразу), теги и действия. Автор — узел экрана: обычно `ProfileHoverCard` со ссылкой и аватаром. Для страницы под `PageLayout width="reading"`.',
      },
    },
  },
} satisfies Meta<typeof ArtifactHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { level: 1, name: /Шапки и лейауты/ })).toBeVisible();
    await expect(canvas.getByText(/Собрано из обсуждения в/)).toBeVisible();
    await expect(canvas.getByText(/изменено/)).toBeVisible();
  },
};

export const Minimal: Story = {
  name: 'Только заголовок и автор',
  args: {
    kind: undefined,
    place: undefined,
    updatedAt: undefined,
    origin: undefined,
    tags: undefined,
    actions: undefined,
  },
};
