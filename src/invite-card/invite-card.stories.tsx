import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { InviteCard, Stack } from '@haunt/ui';

import { photos } from '../lib/stories/demo-photos';

const meta = {
  title: 'Сообщество/InviteCard',
  component: InviteCard,
  tags: ['autodocs'],
  args: {
    name: 'Котики',
    inviter: 'Мария',
    online: 128,
    members: 1024,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    onAccept: fn(),
    onOpen: fn(),
  },
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
          'Приглашение в пространство в ленте: картинка, процедурная `Emblem` (`emblem`) или инициалы, имя, «в сети» и участники, «Принять» (`pending` — спиннер). `joined` — «Перейти», `expired` и `invalid` — погашены, с причиной, без кнопки. Срок — живой `Timestamp`.',
      },
    },
  },
} satisfies Meta<typeof InviteCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Valid: Story = {
  name: 'Действует',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Мария приглашает вас')).toBeInTheDocument();
    await expect(canvas.getByText('1 024 участника')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Принять' }));
    await expect(args.onAccept).toHaveBeenCalled();
  },
};

export const WithImage: Story = {
  name: 'С картинкой',
  args: { iconSrc: photos.crab.src, description: 'Фото котов, голосовые по пятницам.' },
};

export const WithEmblem: Story = { name: 'С эмблемой', args: { emblem: true } };

export const Pending: Story = { name: 'Принимаем', args: { pending: true } };

export const Joined: Story = {
  name: 'Уже участник',
  args: { state: 'joined' },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Перейти' }));
    await expect(args.onOpen).toHaveBeenCalled();
  },
};

export const Broken: Story = {
  name: 'Истёкшее и недействительное',
  render: (args) => (
    <Stack gap={3}>
      <InviteCard {...args} state="expired" />
      <InviteCard {...args} state="invalid" inviter={undefined} />
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Срок приглашения истёк')).toBeInTheDocument();
    await expect(canvas.getByText('Приглашение недействительно')).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Принять' })).toBeNull();
  },
};
