import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Progress } from '@haunt/ui';

const meta = {
  title: 'Отображение/Progress',
  component: Progress,
  tags: ['autodocs'],
  args: { value: 64, label: 'Загрузка файла', size: 'md', tone: 'accent' },
  argTypes: { value: { control: { type: 'range', min: 0, max: 100 } } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Полоса прогресса на Radix: 0–100, без значения — бесконечная (загрузка неизвестной длины). `label` — подпись для скринридера.',
      },
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar', { name: 'Загрузка файла' });

    await expect(bar).toHaveAttribute('aria-valuenow', '64');
  },
};

export const Success: Story = {
  args: { value: 100, tone: 'success', label: 'Готово' },
};

export const Warning: Story = {
  args: { value: 80, tone: 'warning', label: 'Почти заполнено' },
};

export const Danger: Story = {
  args: { value: 30, tone: 'danger', size: 'sm', label: 'Ошибка' },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Indeterminate: Story = {
  args: { value: undefined, label: 'Неизвестная длительность' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('progressbar')).toHaveAttribute(
      'data-state',
      'indeterminate',
    );
  },
};
