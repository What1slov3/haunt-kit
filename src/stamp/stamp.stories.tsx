import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Inline, Stamp } from '@haunt/ui';

const meta = {
  title: 'Сигнал/Stamp',
  component: Stamp,
  tags: ['autodocs'],
  args: { children: 'Одобрено', caption: '07.11.2026 · HNT', tone: 'danger', size: 'md' },
  argTypes: { caption: { control: 'text' } },
  parameters: {
    docs: {
      description: {
        component:
          'Штамп: двойная рамка, капитель, наклон и потёртость. Наклон по умолчанию выводится из текста (−12°…−3°) и всегда один и тот же; потёртость — маска из SVG-шума, вырез, а не пятна цвета фона.',
      },
    },
  },
} satisfies Meta<typeof Stamp>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tones: Story = {
  name: 'Тона и размеры',
  render: (args) => (
    <Inline gap={6} align="center" wrap style={{ padding: 16 }}>
      <Stamp {...args} tone="danger" size="lg">
        Отклонено
      </Stamp>
      <Stamp {...args} tone="accent" caption={undefined}>
        Новое
      </Stamp>
      <Stamp {...args} tone="success" size="sm">
        Проверено
      </Stamp>
      <Stamp {...args} tone="neutral" worn={false} rotate={0}>
        Архив
      </Stamp>
    </Inline>
  ),
};

export const Clean: Story = {
  name: 'Без потёртости',
  args: { worn: false },
};

export const StableRotation: Story = {
  name: 'Наклон из текста',
  render: (args) => (
    <Inline gap={6}>
      <Stamp {...args}>Бета</Stamp>
      <Stamp {...args}>Бета</Stamp>
    </Inline>
  ),
  play: async ({ canvasElement }) => {
    const [first, second] = within(canvasElement)
      .getAllByText('Бета')
      .map((text) => text.parentElement as HTMLElement);

    await expect(first?.style.getPropertyValue('--stamp-rotate')).toBe(
      second?.style.getPropertyValue('--stamp-rotate'),
    );
  },
};
