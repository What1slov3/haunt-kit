import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Badge, DescriptionList, Timestamp } from '@haunt/ui';

import { chartFrame } from '../lib/stories/data-frame';

const meta = {
  title: 'Данные/DescriptionList',
  component: DescriptionList,
  tags: ['autodocs'],
  args: {
    copyable: true,
    items: [
      { label: 'Имя', value: 'haunt-bot' },
      { label: 'ID', value: '1290 4471 0093 2215', mono: true, copyValue: '1290447100932215' },
      { label: 'Роль', value: <Badge>Модератор</Badge> },
      { label: 'Создан', value: <Timestamp date="2026-03-14T12:40:00Z" mode="date" /> },
      {
        label: 'Токен',
        value: 'hb_live_8f2c…a91e',
        mono: true,
        copyValue: 'hb_live_8f2c4d0e77a91e',
      },
      { label: 'Описание', value: 'Следит за порядком в #general и выдаёт роли за активность' },
    ],
  },
  argTypes: {
    items: { control: false },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
  decorators: [
    (Story) => (
      <div style={{ ...chartFrame, maxWidth: 520 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Ключ — значение, плотно: сведения о боте, свойства канала, метаданные файла. `horizontal` — ключи колонкой по самой длинной подписи, `vertical` — ключ над значением сеткой. `mono` — моно у значений (у всех или у пункта), `copyable` — кнопка копирования у строковых значений (или по `copyValue`), видна по наведению.',
      },
    },
  },
} satisfies Meta<typeof DescriptionList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getAllByRole('term')).toHaveLength(6);
    await userEvent.click(canvas.getByRole('button', { name: 'Копировать: ID' }));
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: /Скопировано|Не удалось/ })).toBeInTheDocument(),
    );
  },
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const Compact: Story = {
  name: 'Плотно, моно у всех',
  args: { density: 'compact', mono: true, copyable: false },
};
