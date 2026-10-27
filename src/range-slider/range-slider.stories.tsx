import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { RangeSlider, Text, type RangeSliderProps } from '@haunt/ui';

const meta = {
  title: 'Поля/RangeSlider',
  component: RangeSlider,
  tags: ['autodocs'],
  args: {
    defaultValue: [20, 60],
    step: 5,
    onValueChange: fn(),
    onValueCommit: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360, paddingTop: 32 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Диапазон двумя бегунками — фильтр по цене, длительности, участникам. Бегунки не проходят друг через друга и держат `minDistance`; `aria-valuemin` / `aria-valuemax` каждого — его настоящие границы с учётом второго. Клик по дорожке ставит ближний бегунок. Клавиатура: стрелки — шаг, Shift+стрелки и PageUp/PageDown — `bigStep`, Home/End — до края. `onValueCommit` — когда отпустили или нажали клавишу. Подписи значений — `showValues`: всегда, у активного или нет.',
      },
    },
  },
} satisfies Meta<typeof RangeSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

const thumbs = (canvas: HTMLElement) => within(canvas).getAllByRole('slider');

export const Default: Story = {};

export const AlwaysShowValues: Story = {
  name: 'Подписи всегда',
  args: { showValues: 'always', formatValue: (value: number) => `${value} ₽` },
};

export const MinDistance: Story = {
  name: 'Зазор между значениями',
  args: { minDistance: 20 },
  play: async ({ canvasElement }) => {
    const [low, high] = thumbs(canvasElement);

    await expect(low).toHaveAttribute('aria-valuemax', '40');
    await expect(high).toHaveAttribute('aria-valuemin', '40');
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(thumbs(canvasElement)[0]).toHaveAttribute('aria-disabled', 'true');
  },
};

function PriceFilter(props: RangeSliderProps) {
  const [value, setValue] = useState<readonly [number, number]>([500, 3000]);
  const money = new Intl.NumberFormat('ru', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <Text size="sm" tone="muted">
        Цена: {money.format(value[0])} — {money.format(value[1])}
      </Text>

      <RangeSlider
        {...props}
        value={value}
        onValueChange={setValue}
        min={0}
        max={5000}
        step={100}
        minDistance={200}
        labels={['Цена от', 'Цена до']}
        formatValue={money.format}
      />
    </div>
  );
}

export const Controlled: Story = {
  name: 'Фильтр цены',
  render: (args) => <PriceFilter {...args} />,
};

export const Keyboard: Story = {
  name: 'Клавиатура: шаг, большой шаг, края',
  play: async ({ args, canvasElement }) => {
    const [low, high] = thumbs(canvasElement);

    low!.focus();
    await userEvent.keyboard('{ArrowRight}');

    await expect(low).toHaveAttribute('aria-valuenow', '25');

    await userEvent.keyboard('{PageUp}');

    await expect(low).toHaveAttribute('aria-valuenow', '60');

    // Упёрся во второй: дальше не идёт и не меняется с ним местами
    await userEvent.keyboard('{End}');

    await expect(low).toHaveAttribute('aria-valuenow', '60');
    await expect(high).toHaveAttribute('aria-valuenow', '60');

    await userEvent.keyboard('{Home}');

    await expect(low).toHaveAttribute('aria-valuenow', '0');
    await expect(args.onValueCommit).toHaveBeenLastCalledWith([0, 60]);
  },
};

export const NoCrossing: Story = {
  name: 'Перетаскивание не проходит через второй',
  args: { minDistance: 10 },
  play: async ({ args, canvasElement }) => {
    const root = canvasElement.querySelector('[data-show-values]') as HTMLElement;
    const rect = root.getBoundingClientRect();
    const at = (ratio: number) => ({
      clientX: rect.left + rect.width * ratio,
      clientY: rect.top + 8,
    });
    const pointer = { pointerId: 1, bubbles: true, button: 0 };
    const low = thumbs(canvasElement)[0]!;

    root.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, ...at(0.2) }));
    root.dispatchEvent(new PointerEvent('pointermove', { ...pointer, ...at(0.95) }));
    root.dispatchEvent(new PointerEvent('pointerup', { ...pointer, ...at(0.95) }));

    await waitFor(() => expect(low).toHaveAttribute('aria-valuenow', '50'));
    await expect(args.onValueCommit).toHaveBeenLastCalledWith([50, 60]);
  },
};
