import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Field, NumberInput } from '@haunt/ui';

const meta = {
  title: 'Поля/NumberInput',
  component: NumberInput,
  tags: ['autodocs'],
  args: {
    defaultValue: 10,
    min: 0,
    max: 99,
    step: 1,
    'aria-label': 'Лимит участников',
    onValueChange: fn(),
  },
  argTypes: {
    suffix: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Число в рамке поля с кнопками ± (`IconButton`): лимит участников голоса, слоумод. Стрелки вверх / вниз — шаг, с Shift — ×10, PageUp / PageDown — крупный шаг, Home / End — границы. Пока человек печатает, значение не зажимается — зажим в `min` / `max` и округление до точности `step` на blur и Enter; `onValueChange` приходит после фиксации, не на каждый символ. Зажатая кнопка повторяет шаг. Цифры моно, `role="spinbutton"`.',
      },
    },
  },
} satisfies Meta<typeof NumberInput>;

export default meta;

type Story = StoryObj<typeof meta>;

const spin = (canvas: HTMLElement, name = 'Лимит участников') =>
  within(canvas).getByRole('spinbutton', { name });

export const Default: Story = {};

export const WithSuffix: Story = {
  args: { defaultValue: 30, suffix: 'сек', step: 5, max: 21600, 'aria-label': 'Слоумод' },
};

export const Fraction: Story = {
  name: 'Дробный шаг',
  args: { defaultValue: 1, step: 0.25, min: 0.25, max: 4, 'aria-label': 'Скорость' },
};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const Empty: Story = {
  args: { defaultValue: null, placeholder: 'без лимита' },
};

export const Invalid: Story = { args: { invalid: true } };

export const Disabled: Story = { args: { disabled: true } };

export const InField: Story = {
  args: { 'aria-label': undefined },
  render: (args) => (
    <Field label="Лимит участников" hint="0 — без ограничений">
      <NumberInput {...args} />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    await expect(spin(canvasElement)).toHaveAccessibleDescription('0 — без ограничений');
  },
};

export const KeyboardSteps: Story = {
  name: 'Стрелки, Shift ×10, Home / End',
  play: async ({ args, canvasElement }) => {
    const input = spin(canvasElement);

    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    await expect(input).toHaveValue('12');

    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}');
    await expect(input).toHaveValue('22');

    await userEvent.keyboard('{End}');
    await expect(input).toHaveValue('99');
    await expect(input).toHaveAttribute('aria-valuenow', '99');

    await userEvent.keyboard('{ArrowUp}');
    await expect(input).toHaveValue('99');

    await userEvent.keyboard('{Home}');
    await expect(input).toHaveValue('0');
    await expect(args.onValueChange).toHaveBeenLastCalledWith(0);
  },
};

export const Buttons: Story = {
  name: 'Кнопки ± и границы',
  args: { defaultValue: 98 },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const more = canvas.getByRole('button', { name: 'Больше' });

    await userEvent.click(more);

    await expect(spin(canvasElement)).toHaveValue('99');
    await expect(args.onValueChange).toHaveBeenCalledWith(99);
    await expect(more).toBeDisabled();

    await userEvent.click(canvas.getByRole('button', { name: 'Меньше' }));

    await expect(spin(canvasElement)).toHaveValue('98');
  },
};

export const ClampOnBlur: Story = {
  name: 'Зажим на blur',
  play: async ({ args, canvasElement }) => {
    const input = spin(canvasElement);

    await userEvent.clear(input);
    await userEvent.type(input, '1a50');

    // Пока печатают — без зажима и без onValueChange
    await expect(input).toHaveValue('150');
    await expect(args.onValueChange).not.toHaveBeenCalled();

    await userEvent.tab();

    await expect(input).toHaveValue('99');
    await expect(args.onValueChange).toHaveBeenCalledOnce();
    await expect(args.onValueChange).toHaveBeenCalledWith(99);
  },
};

export const EmptyIsNull: Story = {
  name: 'Пустое поле — null',
  play: async ({ args, canvasElement }) => {
    await userEvent.clear(spin(canvasElement));
    await userEvent.tab();

    await expect(args.onValueChange).toHaveBeenCalledWith(null);
  },
};
