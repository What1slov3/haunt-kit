import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Button, Inline, NumberTicker, Text } from '@haunt/ui';

const meta = {
  title: 'Текст/NumberTicker',
  component: NumberTicker,
  tags: ['autodocs'],
  args: { value: 1240, locale: 'ru' },
  argTypes: { format: { control: 'object' } },
  parameters: {
    docs: {
      description: {
        component:
          'Цифры перекатываются к новому значению: счётчик онлайна, статистика. Каждая цифра — столбец 0–9 со сдвигом `transform`; разряды сопоставляются с конца (999 → 1 000 — новая цифра слева). Форматирование — `Intl.NumberFormat` (`locale`, `format`), табличные цифры. При «эффекты: без» и `prefers-reduced-motion` — сразу новое значение. Скринридер читает число целиком. Поменяйте `value` в контролах.',
      },
    },
  },
} satisfies Meta<typeof NumberTicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Text size="xl" weight="semibold">
      <NumberTicker {...args} />
    </Text>
  ),
};

export const Formats: Story = {
  name: 'Форматы',
  render: () => (
    <Inline gap={6}>
      <NumberTicker value={0.426} format={{ style: 'percent', maximumFractionDigits: 1 }} />
      <NumberTicker value={18_400} format={{ notation: 'compact' }} />
      <NumberTicker value={-37} format={{ signDisplay: 'always' }} />
      <NumberTicker value={1240.5} locale="en" />
    </Inline>
  ),
};

function Counter() {
  const [value, setValue] = useState(998);

  return (
    <Inline gap={3}>
      <Button size="sm" onClick={() => setValue((current) => current + 1)}>
        +1
      </Button>

      <Button size="sm" onClick={() => setValue((current) => current + 137)}>
        +137
      </Button>

      <Text size="xl" weight="semibold">
        <NumberTicker value={value} /> в сети
      </Text>
    </Inline>
  );
}

export const Rolling: Story = {
  name: 'Перекатывается при смене',
  render: () => <Counter />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const plusOne = canvas.getByRole('button', { name: '+1' });

    await expect(canvas.getByText('998')).toBeInTheDocument();

    await userEvent.click(plusOne);
    await userEvent.click(plusOne);
    // Скринридер видит новое значение сразу, с разделителем разрядов
    await expect(canvas.getByText(/^1\s000$/)).toBeInTheDocument();

    const columns = canvasElement.querySelectorAll<HTMLElement>('[style*="--digit"]');

    await expect(columns).toHaveLength(4);
    await expect(columns[0]?.style.getPropertyValue('--digit')).toBe('1');
  },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — без перекатывания',
  decorators: [
    (Story) => (
      <div data-effects="off">
        <Story />
      </div>
    ),
  ],
  render: () => <Counter />,
  play: async ({ canvasElement }) => {
    const column = canvasElement.querySelector<HTMLElement>('[style*="--digit"]');

    await expect(column && getComputedStyle(column).transitionDuration).toBe('0s');
  },
};
