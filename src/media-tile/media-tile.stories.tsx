import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Grid, MediaTile } from '@haunt/ui';

import { photos } from '../lib/stories/demo-photos';

const meta = {
  title: 'Медиа/MediaTile',
  component: MediaTile,
  tags: ['autodocs'],
  args: { name: 'Мария Орлова', speaking: false, muted: false, deafened: false, pinned: false },
  argTypes: { video: { control: false } },
  // Ширина рамки — параметром: декоратор meta внешний, и вложенный декоратор истории его не расширил бы
  decorators: [
    (Story, { parameters }) => (
      <div style={{ maxWidth: (parameters.frameWidth as number | undefined) ?? 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Плитка участника голоса и видео, 16:9. Без `video` — крупный `Avatar` на фоне оттенка из имени (тот же, что у заглушки аватара). `speaking` — бегущий отблеск `data-beam` по краю, концентрично скруглению; при «эффекты: без» и `prefers-reduced-motion` — статичная кромка: говорящего видно всегда. Иконки «микрофон выкл» и «звук выкл», имя на стекле внизу, `pinned` — булавка. Скринридер читает плитку одной подписью. Трек видео (LiveKit) приходит слотом — кит про него не знает.',
      },
    },
  },
} satisfies Meta<typeof MediaTile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {
  name: 'Заглушка-аватар',
};

export const Speaking: Story = {
  args: { speaking: true },
  play: async ({ canvasElement }) => {
    const tile = within(canvasElement).getByRole('group', { name: 'Мария Орлова, говорит' });

    await expect(tile).toHaveAttribute('data-beam');
  },
};

export const Muted: Story = {
  args: { name: 'Иван Лебедев', muted: true, deafened: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('group', {
        name: 'Иван Лебедев, микрофон выключен, звук выключен',
      }),
    ).toBeInTheDocument();
  },
};

export const WithVideo: Story = {
  name: 'С видео',
  args: {
    name: 'Анна Соколова',
    speaking: true,
    pinned: true,
    video: <img src={photos.ridge.src} alt="" />,
  },
};

export const LongName: Story = {
  args: { name: 'Александра Константиновна Преображенская-Высоцкая', muted: true },
  parameters: { frameWidth: 220 },
};

export const VoiceGrid: Story = {
  name: 'Сетка голосового канала',
  parameters: { frameWidth: 880 },
  render: () => (
    <Grid minColumnWidth="240px" gap={2}>
      <MediaTile name="Анна Соколова" pinned video={<img src={photos.ridge.src} alt="" />} />
      <MediaTile name="Мария Орлова" speaking />
      <MediaTile name="Иван Лебедев" muted />
      <MediaTile name="Пётр Волков" video={<img src={photos.orb.src} alt="" />} speaking />
      <MediaTile name="Ольга Ким" muted deafened />
      <MediaTile name="Денис Шах" />
    </Grid>
  ),
};
