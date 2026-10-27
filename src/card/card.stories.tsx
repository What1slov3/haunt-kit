import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Hash, Mic, Shield } from 'lucide-react';
import { expect, within } from 'storybook/test';

import { Card, CardGrid, Icon } from '@haunt/ui';

const meta = {
  title: 'Блоки/Card',
  component: Card,
  subcomponents: { CardGrid },
  tags: ['autodocs'],
  args: {
    title: 'Уведомления',
    description: 'Что присылать на рабочий стол и когда молчать.',
    icon: <Icon icon={Bell} />,
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    icon: { control: false },
  },
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
          'Карточка в духе Fumadocs: рамка, тихий фон, иконка в квадратике, заголовок и описание. С `href` — карточка-ссылка: подсветка при наведении и прожектор. `CardGrid` — авто-сетка карточек.',
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutIcon: Story = {
  args: { icon: undefined },
};

export const Link: Story = {
  name: 'Ссылка',
  args: { href: '#settings', title: 'Роли и права', icon: <Icon icon={Shield} /> },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: /Роли и права/ })).toHaveAttribute(
      'href',
      '#settings',
    );
  },
};

export const External: Story = {
  name: 'Внешняя ссылка',
  args: { href: 'https://example.com', external: true, title: 'Документация API' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link')).toHaveAttribute('target', '_blank');
  },
};

export const LongText: Story = {
  args: {
    title: 'Очень длинное название раздела настроек, которое не помещается в одну строку',
    description:
      'Описание тоже длинное: карточка растёт по высоте, текст переносится, иконка остаётся на месте.',
  },
};

/** Сетка «куда дальше» — как карточки на первой странице документации Fumadocs */
export const Grid: Story = {
  name: 'Сетка',
  parameters: { frameWidth: 760 },
  render: () => (
    <CardGrid>
      <Card
        href="#channels"
        icon={<Icon icon={Hash} />}
        title="Каналы"
        description="Текстовые и голосовые, категории, порядок."
      />

      <Card
        href="#voice"
        icon={<Icon icon={Mic} />}
        title="Голос"
        description="Микрофон, шумоподавление, режим рации."
      />

      <Card
        href="#roles"
        icon={<Icon icon={Shield} />}
        title="Роли"
        description="Кто что видит и кто что может."
      />

      <Card
        href="#notify"
        icon={<Icon icon={Bell} />}
        title="Уведомления"
        description="Упоминания, тишина по расписанию."
      />
    </CardGrid>
  ),
};
