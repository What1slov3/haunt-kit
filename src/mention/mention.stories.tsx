import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Inline, Mention, ProfileHoverCard, Text } from '@haunt/ui';

import { expectVisible, screen } from '../lib/stories/play-helpers';

const meta = {
  title: 'Текст/Mention',
  component: Mention,
  tags: ['autodocs'],
  args: { kind: 'user', children: 'maria', onClick: fn() },
  argTypes: {
    kind: { control: 'inline-radio', options: ['user', 'channel', 'role'] },
    color: { control: 'color' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Упоминание в тексте: `@ник`, `#канал`, `@роль`. Кнопка — фокусируется и открывается с клавиатуры (`onClick`). Без `color` — тон акцента пространства; `color` — цвет роли (данные сообщества), фон и текст выводятся из него по формулам акцента, контраст держится в обеих темах. `self` — упомянули меня. Карточка профиля при наведении — обернуть в `ProfileHoverCard` (или `HoverCard.Trigger asChild` для своего содержимого); так как HoverCard открывается только мышью, то же содержимое должно открываться и кликом.',
      },
    },
  },
} satisfies Meta<typeof Mention>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const mention = within(canvasElement).getByRole('button', { name: '@maria' });

    await userEvent.tab();
    await expect(mention).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Kinds: Story = {
  render: (args) => (
    <Inline gap={2}>
      <Mention {...args} kind="user">
        maria
      </Mention>

      <Mention {...args} kind="channel">
        общий
      </Mention>

      <Mention {...args} kind="role" color="#e0a32e">
        модераторы
      </Mention>

      <Mention {...args} kind="role" color="#3aa0ff">
        дизайн
      </Mention>

      <Mention {...args} self>
        я
      </Mention>
    </Inline>
  ),
};

export const InMessage: Story = {
  name: 'В тексте сообщения',
  render: (args) => (
    <div style={{ maxWidth: 420 }}>
      <Text size="lg" wrap>
        <Mention {...args}>maria</Mention>, глянь в{' '}
        <Mention {...args} kind="channel">
          дизайн-ревью
        </Mention>{' '}
        — там вопрос к{' '}
        <Mention {...args} kind="role" color="#e0a32e">
          модераторы
        </Mention>{' '}
        про новые роли. Ссылки на макеты внутри.
      </Text>
    </div>
  ),
};

/** Карточка профиля по наведению: Mention — триггер `ProfileHoverCard` */
function MentionWithCard(props: Story['args']) {
  return (
    <Text size="lg">
      Спросите у{' '}
      <ProfileHoverCard
        name="Мария Орлова"
        handle="maria"
        status="online"
        roles={[{ name: 'Основатель', color: '#f5a524' }]}
        openDelay={0}
        closeDelay={100}
        side="bottom"
      >
        <Mention {...props}>maria</Mention>
      </ProfileHoverCard>{' '}
      — она знает.
    </Text>
  );
}

export const WithHoverCard: Story = {
  name: 'С карточкой по наведению',
  render: (args) => <MentionWithCard {...args} />,
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: '@maria' }));
    await expectVisible(await screen().findByText('Основатель'));
  },
};
