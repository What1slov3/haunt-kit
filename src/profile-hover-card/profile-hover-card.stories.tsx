import type { Meta, StoryObj } from '@storybook/react-vite';
import { Crown, Flame, Rocket } from 'lucide-react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  Icon,
  Inline,
  Link,
  Mention,
  ProfileHoverCard,
  Stack,
  Text,
  type ProfileCardProps,
  type ProfileRole,
} from '@haunt/ui';

import { expectGone, expectVisible, screen } from '../lib/stories/play-helpers';

/*
 * Роли — данные пространства, а не кита: у пространства есть список ролей (название и цвет), у
 * участника — какие из них ему выданы. Экран берёт участника с сервера и передаёт его роли пропом
 * `roles`. Здесь сервер изображают две константы.
 */
const spaceRoles = {
  founder: { id: 'founder', name: 'Основатель', color: '#f5a524' },
  design: { id: 'design', name: 'Дизайн', color: '#7c5cff' },
  moderators: { id: 'moderators', name: 'Модераторы', color: '#2bb673' },
  guests: { id: 'guests', name: 'Гости' },
} satisfies Record<string, ProfileRole>;

interface Member extends Omit<ProfileCardProps, 'roles'> {
  roleIds: (keyof typeof spaceRoles)[];
}

const members: Member[] = [
  {
    name: 'Мария Орлова',
    handle: 'maria',
    status: 'online',
    subtitle: 'она · в Haunt с марта',
    bio: 'Дизайн, витрины и **таблетки** у вкладок. Пишите в #дизайн, отвечаю вечером.',
    roleIds: ['founder', 'design', 'moderators'],
    badges: [
      { label: 'Ранний участник', icon: <Icon icon={Rocket} size="sm" /> },
      { label: 'Серия 30 дней', icon: <Icon icon={Flame} size="sm" /> },
      { label: 'Владелец пространства', icon: <Icon icon={Crown} size="sm" /> },
    ],
  },
  {
    name: 'Иван Лебедев',
    handle: 'ivan',
    status: 'idle',
    subtitle: 'он · отошёл',
    bio: 'Голос и сервер. Если в канале эхо — это ко мне.',
    roleIds: ['moderators'],
  },
  {
    name: 'Лев',
    handle: 'lev',
    status: 'offline',
    roleIds: [],
  },
];

/** Участник с сервера → пропсы карточки: роли по ключам из списка ролей пространства */
function cardProps({ roleIds, ...member }: Member): ProfileCardProps {
  return { ...member, roles: roleIds.map((id) => spaceRoles[id]) };
}

const maria = cardProps(members[0]!);

const meta = {
  title: 'Сообщество/ProfileHoverCard',
  component: ProfileHoverCard,
  tags: ['autodocs'],
  args: { ...maria, openDelay: 300, children: <span /> },
  argTypes: {
    children: { control: false },
    trigger: { control: 'inline-radio', options: ['both', 'hover', 'click'] },
    badges: { control: false },
    actions: { control: false },
    side: { control: 'inline-radio', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 'var(--space-4)', minHeight: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Карточка профиля у имени, упоминания или аватара — конструкт: `ProfileCard variant="popover"` в стекле вплотную, ширина 300 px. `trigger` — чем открывается: `both` (по умолчанию) — мышью наведением с задержками, а кликом, тапом и с клавиатуры тоже (на `Popover`: фокус внутрь, Esc и клик снаружи закрывают, фокус возвращается на триггер); `hover` — только наведение (примитив `HoverCard`); `click` — только клик. Открытая наведением закрывается при уходе мыши и фокус не забирает; клик её закрепляет. Клик по ссылке-имени открывает карточку, а не переход — в карточке свои действия. Всё содержимое — пропсы `ProfileCard`, карточка ничего не загружает сама. **Роли** (`roles: ProfileRole[]` — название и цвет) — данные пространства: у пространства список ролей, у участника — выданные ему; экран берёт участника с сервера и передаёт его роли пропом. Нет ролей — нет и раздела.',
      },
    },
  },
} satisfies Meta<typeof ProfileHoverCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'По наведению на имя',
  render: (args) => (
    <Text>
      Сообщение от{' '}
      <ProfileHoverCard {...args}>
        <Link href="#profile" tone="inherit">
          {args.name}
        </Link>
      </ProfileHoverCard>
    </Text>
  ),
};

export const Members: Story = {
  name: 'Роли — из данных участника',
  render: () => (
    <Stack gap={2}>
      <Text size="sm" tone="muted">
        У каждого — свои роли из списка ролей пространства; у Льва ролей нет, и раздела тоже.
      </Text>

      <Inline gap={3}>
        {members.map((member) => (
          <ProfileHoverCard
            key={member.handle}
            {...cardProps(member)}
            openDelay={100}
            side="bottom"
          >
            <Link href={`#${member.handle}`} tone="inherit">
              @{member.handle}
            </Link>
          </ProfileHoverCard>
        ))}
      </Inline>
    </Stack>
  ),
};

export const OnMention: Story = {
  name: 'На упоминании в тексте',
  render: (args) => (
    <Text size="lg">
      Спросите у{' '}
      <ProfileHoverCard {...args} openDelay={0} side="bottom">
        <Mention>maria</Mention>
      </ProfileHoverCard>{' '}
      — она знает.
    </Text>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: '@maria' }));
    await expectVisible(await screen().findByText('Основатель'));
  },
};

export const ShowsOnHover: Story = {
  name: 'Появляется по наведению, исчезает при уходе',
  args: { openDelay: 0 },
  render: Default.render,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('link', { name: 'Мария Орлова' });

    await userEvent.hover(trigger);
    await expectVisible(await screen().findByText('она · в Haunt с марта'));
    await userEvent.unhover(trigger);
    await expectGone(() => screen().queryByText('Модераторы'));
  },
};

export const ByClick: Story = {
  name: 'Клик и клавиатура: фокус внутрь, Esc — обратно',
  render: Default.render,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('link', { name: 'Мария Орлова' });

    await userEvent.click(trigger);

    const subtitle = await screen().findByText('она · в Haunt с марта');

    await expectVisible(subtitle);
    // Открыта кликом — фокус на карточке: дальше по ней Tab, Esc закрывает с первого раза
    await waitFor(() =>
      expect(subtitle.closest('[role="dialog"]')).toContainElement(
        document.activeElement as HTMLElement,
      ),
    );

    await userEvent.keyboard('{Escape}');
    await expectGone(() => screen().queryByText('она · в Haunt с марта'));
    await expect(trigger).toHaveFocus();
  },
};

export const PinByClick: Story = {
  name: 'Наведение, потом клик — карточка закреплена',
  args: { openDelay: 0 },
  render: Default.render,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('link', { name: 'Мария Орлова' });

    await userEvent.hover(trigger);
    await expectVisible(await screen().findByText('она · в Haunt с марта'));

    await userEvent.click(trigger);
    await userEvent.unhover(trigger);
    // Уход мыши закрыл бы открытую наведением; закреплённая кликом остаётся
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expectVisible(screen().getByText('она · в Haunt с марта'));
  },
};
