import type { Meta, StoryObj } from '@storybook/react-vite';
import { Crown, Flame, MessageCircle, Mic, Star } from 'lucide-react';
import { expect, within } from 'storybook/test';

import { Achievement, Grid, Icon, Stack } from '@haunt/ui';

const meta = {
  title: 'Сообщество/Achievement',
  component: Achievement,
  tags: ['autodocs'],
  args: {
    name: 'Голос эфира',
    description: '10 часов в голосовых каналах',
    icon: <Icon icon={Mic} />,
    rarity: 'rare',
    unlockedAt: '2026-03-14T19:00:00Z',
  },
  argTypes: { icon: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ width: 200 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Награда с редкостью `common` / `rare` / `epic` / `legendary`: медаль цвета редкости (из токенов статуса), свечение растёт с редкостью (`--fx-glow`), у эпической и легендарной — блик по наведению и фокусу, легендарная бликует и при появлении. Постоянного движения нет; `data-effects="off"` — статичная медаль. Заблокированная — погашена, с замком и прогрессом к получению.',
      },
    },
  },
} satisfies Meta<typeof Achievement>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Rare: Story = {
  name: 'Редкая',
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('редкое')).toBeInTheDocument();
  },
};

export const Rarities: Story = {
  name: 'Все редкости',
  decorators: [
    (Story) => (
      <div style={{ width: 720 }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Grid columns={4} gap={3}>
      <Achievement name="Первое слово" icon={<Icon icon={MessageCircle} />} rarity="common" />
      <Achievement name="Голос эфира" icon={<Icon icon={Mic} />} rarity="rare" />
      <Achievement name="Серия 100 дней" icon={<Icon icon={Flame} />} rarity="epic" />
      <Achievement name="Основатель" icon={<Icon icon={Crown} />} rarity="legendary" />
    </Grid>
  ),
};

export const Locked: Story = {
  name: 'Не получена, с прогрессом',
  args: { locked: true, rarity: 'epic', progress: { value: 37, max: 100 }, unlockedAt: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Не получено')).toBeInTheDocument();
    await expect(canvas.getByRole('progressbar')).toHaveAccessibleName('Голос эфира: 37 из 100');
  },
};

export const Rows: Story = {
  name: 'Строки списка',
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Stack gap={1}>
      <Achievement
        layout="row"
        name="Звезда канала"
        description="50 реакций на сообщение"
        icon={<Icon icon={Star} />}
        rarity="legendary"
        unlockedAt="2026-10-01"
      />
      <Achievement
        layout="row"
        name="Серия 100 дней"
        icon={<Icon icon={Flame} />}
        rarity="epic"
        locked
        progress={{ value: 64, max: 100 }}
      />
      <Achievement
        layout="row"
        name="Первое слово"
        icon={<Icon icon={MessageCircle} />}
        unlockedAt="2026-02-11"
      />
    </Stack>
  ),
};

export const EmojiIcon: Story = {
  name: 'Эмодзи вместо иконки',
  args: { icon: '🦄', rarity: 'legendary', name: 'Единорог' },
};
