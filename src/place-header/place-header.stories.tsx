import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { PlaceHeader, Stack } from '@haunt/ui';

import { demoPeople } from '../lib/stories/demo-space';
import { PlaceActions } from '../lib/stories/demo-space-parts';
import { screen } from '../lib/stories/play-helpers';

const topic =
  'Обсуждаем дизайн витрины, вкладок и шапок. Макеты — в закрепе, решения переносим в артефакты, чтобы не терялись в ленте.';

const meta = {
  title: 'Сообщество/PlaceHeader',
  component: PlaceHeader,
  tags: ['autodocs'],
  args: { name: 'дизайн', kind: 'stream', topic, actions: <PlaceActions /> },
  argTypes: {
    kind: { control: 'inline-radio', options: ['stream', 'scene', 'screen', 'shelf', 'impulses'] },
    actions: { control: false },
    icon: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 820, border: '1px solid var(--border)', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Шапка места — полоса над лентой для слота `header` у AppShell (или `ChatLayout`): значок по главной возможности места (`kind`: поток, сцена, экран, полка, импульсы), имя, тема в одну строку — целиком в поповере по клику, индикатор живой сессии (`live`: «3 в эфире» с аватарами; с `onJoin` — кнопка войти) и действия экрана.',
      },
    },
  },
} satisfies Meta<typeof PlaceHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Тема места' }));
    await expect(await screen().findByRole('dialog')).toHaveTextContent('решения переносим');
  },
};

export const Live: Story = {
  name: 'Живая сессия — войти',
  args: {
    name: 'вечерний созвон',
    kind: 'scene',
    topic: 'По пятницам с восьми',
    live: { count: 3, people: demoPeople.slice(0, 3), onJoin: fn() },
  },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /3 в эфире/ }));
    await expect(args.live!.onJoin).toHaveBeenCalledOnce();
  },
};

export const Kinds: Story = {
  name: 'Все виды мест',
  render: () => (
    <Stack gap={0}>
      <PlaceHeader name="дизайн" kind="stream" topic="Обсуждения и решения" />
      <PlaceHeader name="созвон" kind="scene" live={{ count: 5 }} />
      <PlaceHeader name="кино" kind="screen" topic="Смотрим вместе по пятницам" />
      <PlaceHeader name="библиотека" kind="shelf" topic="Гайды, правила, ссылки" />
      <PlaceHeader name="кто тут" kind="impulses" />
    </Stack>
  ),
};
