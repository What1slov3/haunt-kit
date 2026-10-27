import type { Meta, StoryObj } from '@storybook/react-vite';
import { Inbox, SearchX } from 'lucide-react';

import { Button, EmptyState, Icon, Surface } from '@haunt/ui';

const meta = {
  title: 'Отображение/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    icon: <Icon icon={Inbox} size="lg" />,
    title: 'Пока тихо',
    description: 'В этом канале ещё нет сообщений. Напишите первым.',
  },
  argTypes: {
    icon: { control: false },
    action: { control: false },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <Surface level={2} style={{ maxWidth: 360 }}>
        <Story />
      </Surface>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Пустой список, нет результатов поиска, канал без сообщений: иконка в кружке, заголовок, пояснение и действие. `compact` — для узких панелей.',
      },
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    action: (
      <Button variant="accent" size="sm">
        Написать
      </Button>
    ),
  },
};

export const Compact: Story = {
  args: {
    compact: true,
    icon: undefined,
    title: 'Никого не найдено',
    description: 'Попробуйте другой запрос',
  },
};

export const NoResults: Story = {
  args: {
    icon: <Icon icon={SearchX} size="lg" />,
    title: 'По запросу «очень-длинное-название-канала-которого-нет» ничего не найдено',
    description: 'Проверьте раскладку клавиатуры или поищите по всем пространствам сразу.',
  },
};
