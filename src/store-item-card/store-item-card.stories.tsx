import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Headphones } from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  Grid,
  Icon,
  Markdown,
  MessageItem,
  ProfileCard,
  StoreItemCard,
  TokenScope,
  type StoreItemState,
  type TokenValues,
} from '@haunt/ui';
import { sound, type SoundSpec } from '@haunt/ui/sound';

const meta = {
  title: 'Сообщество/StoreItemCard',
  component: StoreItemCard,
  tags: ['autodocs'],
  args: {
    name: 'Неон',
    roleColor: '#3dd6c3',
    price: 1200,
    previewName: 'Мария Орлова',
    description: 'Имя бирюзовым в чате и списке участников',
    onBuy: fn(),
    onEquip: fn(),
    onUnequip: fn(),
  },
  argTypes: { currency: { control: false }, badge: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ width: 260 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Вещь, которой человек выражает себя в сообществе: имя, след в ленте, аура профиля, рамка аватара, звук входа. Превью по умолчанию — строка сообщения с именем в цвете вещи (`roleColor`, с `roleColor2` — градиентом); своё — `preview`: живой кусок интерфейса с применённой вещью. `kind` — куда надевается (метка `[ след ]`). Получить — за цену (`acquisition="purchase"`, по умолчанию: «Купить», при `balance` меньше цены — «Не хватает средств») или за условие (`acquisition="earn"`: `requirement`, `progress` 0…1, при 1 — «Забрать»). Дальше `owned` — «Надеть», `equipped` — кромка и свечение цвета вещи, «Снять», `unavailable` — погашено с причиной. Рядом — «Примерить» (`onTry`, `trying`: экран показывает вещь на настоящем интерфейсе) и «Подарить» (`onGift`). Сама вещь — данные: значения ручек косметики (`authorPaint`, `trailPaint`, `trailWidth`, `trailGlow`, `auraPaint`, `avatarFrame`) в `TokenScope` / `setTokens` и звук `SoundSpec` для `sound.play` — так одна вещь одинаково выглядит в ленте, профиле и списке участников.',
      },
    },
  },
} satisfies Meta<typeof StoreItemCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Available: Story = {
  name: 'Можно купить',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Купить' }));
    await expect(args.onBuy).toHaveBeenCalled();
    await expect(within(canvasElement).getByText('Цена: 1 200')).toBeInTheDocument();
  },
};

export const NotEnough: Story = {
  name: 'Не хватает средств',
  args: { balance: 800 },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Не хватает средств' }),
    ).toBeDisabled();
  },
};

export const Owned: Story = { name: 'Куплено', args: { state: 'owned' } };

export const Equipped: Story = {
  name: 'Надето',
  args: { state: 'equipped', roleColor: '#ff5ca8', roleColor2: '#ffb35c', name: 'Закат' },
};

export const Unavailable: Story = {
  name: 'Недоступно',
  args: {
    state: 'unavailable',
    unavailableReason: 'С 10 уровня',
    badge: (
      <Badge tone="warning" size="sm">
        новое
      </Badge>
    ),
  },
};

/** Полный путь: купить → надеть → снять */
function Flow() {
  const [state, setState] = useState<StoreItemState>('available');

  return (
    <StoreItemCard
      name="Неон"
      roleColor="#3dd6c3"
      price={1200}
      state={state}
      onBuy={() => setState('owned')}
      onEquip={() => setState('equipped')}
      onUnequip={() => setState('owned')}
    />
  );
}

export const BuyAndEquip: Story = {
  name: 'Купить, надеть, снять',
  render: () => <Flow />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Купить' }));
    await expect(canvas.getByText('Куплено')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Надеть' }));
    await expect(canvas.getByText('Надето')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Снять' }));
    await expect(canvas.getByRole('button', { name: 'Надеть' })).toBeInTheDocument();
  },
};

export const Shelf: Story = {
  name: 'Витрина',
  decorators: [
    (Story) => (
      <div style={{ width: 820 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Grid columns={3} gap={3}>
      <StoreItemCard {...args} />
      <StoreItemCard
        {...args}
        name="Закат"
        roleColor="#ff5ca8"
        roleColor2="#ffb35c"
        price={2400}
        state="equipped"
      />
      <StoreItemCard
        {...args}
        name="Лёд"
        roleColor="#8ab4ff"
        price={5000}
        state="unavailable"
        unavailableReason="С 10 уровня"
      />
    </Grid>
  ),
};

/** Вещи — данные: значения ручек косметики, а не свой CSS */
const cometTrail: TokenValues = {
  trailPaint: 'linear-gradient(#7c6bff, #ff5ca8)',
  trailWidth: '3px',
  trailGlow: '0 0 8px rgba(124, 107, 255, 0.6)',
};

const sunsetName: TokenValues = {
  authorPaint: 'linear-gradient(90deg, #ff5ca8, #ffb35c)',
  authorFill: 'transparent',
};

const starAura: TokenValues = {
  auraPaint: [
    'radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent)',
    'radial-gradient(1px 1px at 70% 20%, #fff 50%, transparent)',
    'radial-gradient(1.5px 1.5px at 40% 70%, #fff 50%, transparent)',
    'radial-gradient(1px 1px at 85% 60%, #fff 50%, transparent)',
    'radial-gradient(80% 90% at 0% 0%, rgba(124, 107, 255, 0.45), transparent 70%)',
  ].join(', '),
};

const ringFrame: TokenValues = {
  avatarFrame: '0 0 0 2px var(--background), 0 0 0 4px #3dd6c3, 0 0 12px rgba(61, 214, 195, 0.6)',
};

const joinMotif: SoundSpec = {
  minLevel: 'subtle',
  minInterval: 300,
  voices: [392, 523.25, 659.26].map((frequency, i) => ({
    kind: 'tone' as const,
    wave: 'sine' as const,
    frequency,
    delay: i * 0.07,
    gain: 0.28,
    envelope: { attack: 0.01, decay: 0.18 },
  })),
};

function TrailPreview() {
  return (
    <TokenScope tokens={{ ...cometTrail, ...sunsetName }}>
      <div data-message-list="">
        {['Собираемся в девять?', 'Я возьму доску.'].map((text, index) => (
          <MessageItem
            key={text}
            author="Мария Орлова"
            authorColor="#7c6bff"
            avatar={<Avatar name="Мария Орлова" size="lg" shape="rounded" />}
            timestamp="2026-10-27T21:00:00"
            timeMode="time"
            grouped={index > 0}
            style={{ paddingInline: 0 }}
          >
            <Markdown>{text}</Markdown>
          </MessageItem>
        ))}
      </div>
    </TokenScope>
  );
}

export const Kinds: Story = {
  name: 'Разные вещи: след, аура, рамка, звук',
  decorators: [
    (Story) => (
      <div style={{ width: 1100 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Grid columns={4} gap={3}>
      <StoreItemCard
        {...args}
        name="След кометы"
        kind="след в ленте"
        roleColor="#7c6bff"
        roleColor2="#ff5ca8"
        price={1800}
        previewLabel="Так выглядят твои сообщения"
        description="Линия от аватара вдоль твоих сообщений — градиентом и со свечением"
        preview={<TrailPreview />}
      />

      <StoreItemCard
        {...args}
        name="Звёздная аура"
        kind="аура профиля"
        roleColor="#7c6bff"
        price={2400}
        previewLabel="Так выглядит профиль"
        description="Звёзды за именем в карточке профиля"
        preview={
          <TokenScope tokens={starAura}>
            <ProfileCard name="Мария Орлова" handle="maria" status="online" />
          </TokenScope>
        }
      />

      <StoreItemCard
        {...args}
        name="Бирюзовое кольцо"
        kind="рамка аватара"
        roleColor="#3dd6c3"
        price={900}
        previewLabel="Так выглядит аватар"
        description="Кольцо со свечением вокруг аватара в ленте и в голосе"
        preview={
          <TokenScope tokens={ringFrame} style={{ display: 'flex', gap: 16, padding: 8 }}>
            <Avatar name="Мария Орлова" size="lg" />

            <Avatar name="Мария Орлова" size="lg" shape="rounded" />
          </TokenScope>
        }
      />

      <StoreItemCard
        {...args}
        name="Мотив входа"
        kind="звук входа"
        roleColor="#ffb35c"
        price={600}
        previewLabel="Так тебя слышат в голосе"
        description="Три ноты, когда ты заходишь в сцену"
        preview={
          <Button
            variant="secondary"
            iconStart={<Icon icon={Headphones} size="sm" />}
            onClick={() => sound.play(joinMotif, { id: 'preview:join-motif' })}
          >
            Послушать
          </Button>
        }
      />
    </Grid>
  ),
};

export const Earn: Story = {
  name: 'За вклад: условие и прогресс',
  args: {
    name: 'Летописец',
    kind: 'метка у ника',
    roleColor: '#ffb35c',
    acquisition: 'earn',
    price: undefined,
    requirement: 'Пять страниц в лоре пространства',
    progress: 0.6,
    description: 'Метка [ летописец ] рядом с именем',
    onClaim: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('progressbar', { name: 'Прогресс: 60%' })).toBeInTheDocument();
    // Условие не выполнено — забирать нечего, цены нет
    await expect(canvas.queryByRole('button', { name: 'Забрать' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Купить' })).toBeNull();
  },
};

export const EarnReady: Story = {
  name: 'За вклад: можно забрать',
  args: { ...Earn.args, progress: 1, onClaim: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Забрать' }));
    await expect(args.onClaim).toHaveBeenCalledOnce();
  },
};

export const TryAndGift: Story = {
  name: 'Примерить и подарить',
  args: { onGift: fn() },
  render: function TryStory(args) {
    const [trying, setTrying] = useState(false);

    return <StoreItemCard {...args} trying={trying} onTry={() => setTrying((value) => !value)} />;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Примерить' }));
    await expect(canvas.getByRole('button', { name: 'Снять примерку' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Подарить' }));
    await expect(args.onGift).toHaveBeenCalledOnce();
  },
};
