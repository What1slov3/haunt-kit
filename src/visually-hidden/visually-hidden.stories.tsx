import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell } from 'lucide-react';
import { expect, within } from 'storybook/test';

import { Icon, Text, VisuallyHidden } from '@haunt/ui';

const meta = {
  title: 'Раскладка/VisuallyHidden',
  component: VisuallyHidden,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Невидимо, но читается скринридером (Radix VisuallyHidden): заголовок диалога без видимого заголовка, живая область (`role="status"`), подпись к значку. `asChild` прячет свой элемент без обёртки. Спрятать насовсем — атрибут `hidden`, не этот компонент.',
      },
    },
  },
} satisfies Meta<typeof VisuallyHidden>;

export default meta;

type Story = StoryObj<typeof meta>;

export const IconLabel: Story = {
  name: 'Подпись к значку',
  render: () => (
    <button type="button" style={{ display: 'inline-flex', padding: 6 }}>
      <Icon icon={Bell} />
      <VisuallyHidden>Уведомления</VisuallyHidden>
    </button>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('button')).toHaveAccessibleName('Уведомления');
    await expect(canvas.getByText('Уведомления').getBoundingClientRect().width).toBeLessThanOrEqual(
      1,
    );
  },
};

export const LiveRegion: Story = {
  name: 'Живая область',
  render: () => (
    <>
      <Text>Видимый текст; объявление слышит только скринридер.</Text>
      <VisuallyHidden role="status">Сообщение отправлено</VisuallyHidden>
    </>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      'Сообщение отправлено',
    );
  },
};

export const AsChild: Story = {
  name: 'asChild',
  render: () => (
    <VisuallyHidden asChild>
      <h2>Заголовок раздела для скринридера</h2>
    </VisuallyHidden>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { level: 2 })).toBeInTheDocument();
  },
};
