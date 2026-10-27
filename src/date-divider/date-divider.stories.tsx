import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { DateDivider, Stack, UiStringsProvider } from '@haunt/ui';

// Фиксированное «сейчас»: подписи историй не зависят от дня прогона
const now = new Date(2026, 9, 27, 15, 0);

const meta = {
  title: 'Сообщество/DateDivider',
  component: DateDivider,
  tags: ['autodocs'],
  args: { date: new Date(2026, 9, 25, 18, 0), now },
  decorators: [
    (Story) => (
      <div style={{ width: 560 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Разделитель дня в ленте на `Divider`: «сегодня», «вчера» (`relative`, по умолчанию), иначе день недели и дата — «воскресенье, 25 октября», год — если не текущий. Слова и порядок — из Intl локали (`useUiLocale`), своих строк нет. Где ставить — на смене дня между соседями (`sameDay`). Подпись — и `aria-label`: содержимое разделителя скринридер не читает.',
      },
    },
  },
} satisfies Meta<typeof DateDivider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Days: Story = {
  name: 'Сегодня, вчера, раньше',
  render: (args) => (
    <Stack gap={4}>
      <DateDivider {...args} date={new Date(2026, 9, 27, 9, 0)} />
      <DateDivider {...args} date={new Date(2026, 9, 26, 22, 0)} />
      <DateDivider {...args} />
      <DateDivider {...args} date={new Date(2025, 11, 31, 23, 0)} />
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const names = within(canvasElement)
      .getAllByRole('separator')
      .map((separator) => separator.getAttribute('aria-label'));

    await expect(names).toEqual([
      'сегодня',
      'вчера',
      'воскресенье, 25 октября',
      'среда, 31 декабря 2025 г.',
    ]);
  },
};

export const Absolute: Story = {
  name: 'Без «сегодня»',
  args: { date: new Date(2026, 9, 27, 9, 0), relative: false },
};

export const Accent: Story = { name: 'Тон акцента', args: { tone: 'accent' } };

export const English: Story = {
  name: 'Английская локаль',
  render: (args) => (
    <UiStringsProvider locale="en">
      <DateDivider {...args} />
    </UiStringsProvider>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('separator')).toHaveAccessibleName(
      'Sunday, October 25',
    );
  },
};
