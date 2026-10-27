import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hash } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { Collapsible, Icon, NavItem, Surface } from '@haunt/ui';

import { expectGone, expectVisible } from '../lib/stories/play-helpers';

interface ChannelCategoryProps {
  /** Название категории */
  title: string;
  /** Открыта ли категория при первом рендере */
  defaultOpen?: boolean;
  /** Каналы внутри */
  channels: string[];
}

/** Категория каналов — как в боковой панели мессенджера */
function ChannelCategory({ title, defaultOpen, channels }: ChannelCategoryProps) {
  return (
    <Collapsible.Root defaultOpen={defaultOpen}>
      <Collapsible.Trigger category>{title}</Collapsible.Trigger>

      <Collapsible.Content>
        {channels.map((name) => (
          <NavItem key={name} icon={<Icon icon={Hash} />}>
            {name}
          </NavItem>
        ))}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

const meta = {
  title: 'Списки/Collapsible',
  component: ChannelCategory,
  subcomponents: { 'Collapsible.Trigger': Collapsible.Trigger },
  tags: ['autodocs'],
  args: {
    title: 'Текстовые',
    defaultOpen: true,
    channels: ['general', 'design', 'random'],
  },
  decorators: [
    (Story) => (
      <Surface level={2} panel style={{ width: 240, padding: 'var(--space-1)' }}>
        <Story />
      </Surface>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Сворачиваемый блок. `Collapsible.Trigger category` — заголовок категории моно-капителью с шевроном. Высота анимируется по `--radix-collapsible-content-height`.',
      },
    },
  },
} satisfies Meta<typeof ChannelCategory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = {
  args: { defaultOpen: false },
};

export const LongTitle: Story = {
  args: { title: 'Очень длинное название категории каналов, которое не помещается' },
};

export const Toggles: Story = {
  name: 'Категория сворачивается и разворачивается',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Текстовые' });

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(trigger);

    await expectGone(() => canvas.queryByRole('button', { name: 'random' }));
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);

    await expectVisible(await canvas.findByRole('button', { name: 'random' }));
  },
};

/** Без `category` — голый триггер Radix: своя разметка */
export const PlainTrigger: Story = {
  render: () => (
    <Collapsible.Root>
      <Collapsible.Trigger>Показать подробности</Collapsible.Trigger>

      <Collapsible.Content>Подробности: создан 12 октября, 4 участника.</Collapsible.Content>
    </Collapsible.Root>
  ),
};
