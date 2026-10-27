import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Avatar, Inline } from '@haunt/ui';

const imageSrc =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Crect width='10' height='10' fill='%236e5ce6'/%3E%3Ccircle cx='5' cy='5' r='3' fill='%23fff'/%3E%3C/svg%3E";

const meta = {
  title: 'Отображение/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: { name: 'Мария Орлова', size: 'md' },
  parameters: {
    docs: {
      description: {
        component:
          'Аватар человека (круг) или сообщества (`shape="rounded"`). Без картинки — инициалы на устойчивом цвете из имени: один человек всегда одного цвета. Точка статуса читается скринридером.',
      },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <Inline gap={2} align="end">
      <Avatar {...args} size="xs" />
      <Avatar {...args} size="sm" />
      <Avatar {...args} size="md" />
      <Avatar {...args} size="lg" />
      <Avatar {...args} size="xl" />
    </Inline>
  ),
};

export const Statuses: Story = {
  render: (args) => (
    <Inline gap={3}>
      <Avatar {...args} name="Анна Соколова" status="online" />
      <Avatar {...args} name="Пётр Волков" status="idle" />
      <Avatar {...args} name="Мария Орлова" status="dnd" />
      <Avatar {...args} name="Иван Лебедев" status="offline" />
    </Inline>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: 'не беспокоить' })).toBeVisible();
  },
};

export const Community: Story = {
  args: { name: 'Haunt Dev', shape: 'rounded', size: 'lg' },
};

export const WithImage: Story = {
  args: { name: 'С картинкой', src: imageSrc, size: 'xl' },
};

/** Картинка не загрузилась — остаются инициалы */
export const BrokenImage: Story = {
  args: { name: 'Битая Ссылка', src: '/does-not-exist.png', size: 'lg' },
};

/** Говорит в голосовом канале: бегущее кольцо; гаснет при data-effects="off" */
export const Speaking: Story = {
  args: { name: 'Иван Лебедев', status: 'online', speaking: true, size: 'lg' },
};

export const SingleName: Story = {
  args: { name: 'котик' },
};
