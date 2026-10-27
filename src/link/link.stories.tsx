import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Link, Text } from '@haunt/ui';

const meta = {
  title: 'Текст/Link',
  component: Link,
  tags: ['autodocs'],
  args: {
    href: '#link',
    children: 'Внутренняя ссылка',
    tone: 'accent',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Текстовая ссылка — обычный `<a>`: роутера пока нет. `external` открывает в новой вкладке, ставит `rel="noopener noreferrer"` и стрелку.',
      },
    },
  },
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Accent: Story = {};

export const Muted: Story = {
  args: { tone: 'muted', children: 'Тихая ссылка' },
};

/** Цвет окружающего текста — для имени автора, кликабельных заголовков */
export const Inherit: Story = {
  render: (args) => (
    <Text tone="muted">
      Написал{' '}
      <Link {...args} tone="inherit">
        @maria
      </Link>{' '}
      в #general
    </Text>
  ),
};

export const External: Story = {
  args: { href: 'https://www.radix-ui.com', external: true, children: 'Radix' },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: /Radix/ });

    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  },
};

export const InText: Story = {
  render: (args) => (
    <Text size="lg" wrap style={{ maxWidth: 360 }}>
      Голосовые каналы пока в бете — подробности в <Link {...args}>заметке о выпуске</Link>, а
      вопросы можно задать в #support.
    </Text>
  ),
};
