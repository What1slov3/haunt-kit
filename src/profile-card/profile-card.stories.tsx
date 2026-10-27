import type { Meta, StoryObj } from '@storybook/react-vite';
import { Crown, Flame, Rocket, Sparkles } from 'lucide-react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  Button,
  Icon,
  ProfileCard,
  ReputationMeter,
  XpBar,
  type ProfileCardProps,
} from '@haunt/ui';

import { screen } from '../lib/stories/play-helpers';
import { photos } from '../lib/stories/demo-photos';

const base: ProfileCardProps = {
  name: 'Мария Орлова',
  handle: 'maria',
  status: 'online',
  subtitle: 'она · в Haunt с марта',
  bio: 'Дизайн, витрины и **таблетки** у вкладок. Пишите в #дизайн, отвечаю вечером.',
  roles: [
    { name: 'Основатель', color: '#f5a524' },
    { name: 'Дизайн', color: '#7c5cff' },
    { name: 'Модераторы', color: '#2bb673' },
    { name: 'Без цвета' },
  ],
  badges: [
    { label: 'Ранний участник', icon: <Icon icon={Rocket} size="sm" /> },
    { label: 'Серия 30 дней', icon: <Icon icon={Flame} size="sm" /> },
    { label: 'Владелец пространства', icon: <Icon icon={Crown} size="sm" /> },
  ],
};

const meta = {
  title: 'Сообщество/ProfileCard',
  component: ProfileCard,
  tags: ['autodocs'],
  args: base,
  argTypes: {
    badges: { control: false },
    actions: { control: false },
    children: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Карточка профиля — «пропуск» участника: из угла светится аура цвета профиля (`bannerColor`, без него — акцент пространства), аватар — скруглённый квадрат в строке с именем, статус — словом в моно-строке под ником, значки с подсказкой рядом с именем (фокусируются). «О себе» — `Markdown inline`, роли — метками цветом роли. Обложка `banner` — картинка в рамке над именем. **Откуда данные:** всё — пропсы, карточка ничего не загружает; роли (`roles: ProfileRole[]` — название и цвет) — роли участника в пространстве, экран берёт их из данных участника с сервера. `variant="popover"` — компактная, для `ProfileHoverCard` по наведению на имя («Сообщество/ProfileHoverCard»); `page` — шапка страницы профиля, туда же ложатся `XpBar` и `ReputationMeter` детьми.',
      },
    },
  },
} satisfies Meta<typeof ProfileCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Popover: Story = {
  name: 'Компактная',
  args: {
    actions: (
      <Button size="sm" variant="secondary" fullWidth>
        Написать
      </Button>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: 'Роли' })).toBeInTheDocument();
    await expect(
      canvas.getAllByRole('img', { name: /Ранний участник|Серия|Владелец/ }),
    ).toHaveLength(3);
    await waitFor(() => expect(canvas.getByText('таблетки').tagName).toBe('STRONG'));
  },
};

export const BadgeTooltip: Story = {
  name: 'Значок: подсказка с клавиатуры',
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('img', { name: 'Ранний участник' })).toHaveFocus();
    await waitFor(() => expect(screen().getByRole('tooltip')).toHaveTextContent('Ранний участник'));
  },
};

export const BannerImage: Story = { name: 'Баннер-картинка', args: { banner: photos.aurora.src } };

export const OwnColor: Story = {
  name: 'Свой цвет профиля',
  args: { bannerColor: '#e5484d', status: 'dnd' },
};

export const Minimal: Story = {
  name: 'Только имя',
  args: {
    handle: undefined,
    subtitle: undefined,
    bio: undefined,
    roles: undefined,
    badges: undefined,
    status: undefined,
  },
};

export const Page: Story = {
  name: 'Страница профиля',
  args: {
    variant: 'page',
    banner: photos.aurora.src,
    actions: (
      <>
        <Button size="sm" variant="accent">
          Написать
        </Button>

        <Button size="sm" variant="secondary" iconStart={<Icon icon={Sparkles} size="xs" />}>
          Подарить роль
        </Button>
      </>
    ),
    children: (
      <>
        <XpBar level={12} xp={1240} xpToNext={2000} />
        <ReputationMeter
          value={420}
          history={[300, 320, 310, 360, 390, 420]}
          deltaLabel="за месяц"
        />
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 560 }}>
        <Story />
      </div>
    ),
  ],
};

export const LongName: Story = {
  name: 'Длинное имя и ник',
  args: { name: 'Мария-Антуанетта Орлова-Преображенская', handle: 'maria_antoinette_the_designer' },
};
