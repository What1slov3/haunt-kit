import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Field, PinInput } from '@haunt/ui';

import { expectFocused } from '../lib/stories/play-helpers';

const meta = {
  title: 'Поля/PinInput',
  component: PinInput,
  tags: ['autodocs'],
  args: {
    length: 6,
    type: 'numeric',
    label: 'Код из письма',
    onValueChange: fn(),
    onComplete: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          'Код из отдельных моно-ячеек: вход, 2FA, код приглашения. Ввод переводит фокус дальше, Backspace очищает ячейку и уходит назад, вставка заполняет код целиком, стрелки и Home / End ходят по ячейкам. Дыр в коде не бывает: клик в ячейку дальше заполненных ставит фокус в первую пустую. `onComplete` — код набран целиком. Группа подписана `label`, каждая ячейка — «Символ N из M»; внутри `<Field>` метка ведёт в первую ячейку.',
      },
    },
  },
} satisfies Meta<typeof PinInput>;

export default meta;

type Story = StoryObj<typeof meta>;

const cell = (canvas: HTMLElement, index: number, length = 6) =>
  within(canvas).getByRole('textbox', { name: `Символ ${index} из ${length}` });
const cells = (canvas: HTMLElement) =>
  within(within(canvas).getByRole('group')).getAllByRole('textbox');
const code = (canvas: HTMLElement) =>
  cells(canvas)
    .map((input) => (input as HTMLInputElement).value)
    .join('');

export const Default: Story = {};

export const Grouped: Story = {
  name: 'Группы по 3',
  args: { groupSize: 3, defaultValue: '123' },
};

export const Invite: Story = {
  name: 'Код приглашения',
  args: { type: 'alphanumeric', length: 8, groupSize: 4, label: 'Код приглашения', size: 'md' },
};

export const Masked: Story = {
  args: { length: 4, mask: true, label: 'PIN', defaultValue: '12' },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: '123456' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: '12' },
};

export const InField: Story = {
  render: (args) => (
    <Field label="Код подтверждения" error="Код устарел — запросите новый">
      <PinInput {...args} />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole('group', { name: 'Код из письма' });

    await expect(group).toHaveAccessibleDescription('Код устарел — запросите новый');

    await userEvent.click(within(canvasElement).getByText('Код подтверждения'));

    await expect(cell(canvasElement, 1)).toHaveFocus();
  },
};

export const TypeAndComplete: Story = {
  name: 'Ввод с автопереходом и onComplete',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(cell(canvasElement, 1));
    await userEvent.keyboard('12a3');

    await expect(code(canvasElement)).toBe('123');
    await expect(cell(canvasElement, 4)).toHaveFocus();

    await userEvent.keyboard('456');

    await expect(args.onComplete).toHaveBeenCalledOnce();
    await expect(args.onComplete).toHaveBeenCalledWith('123456');
  },
};

export const BackspaceGoesBack: Story = {
  name: 'Backspace очищает и уходит назад',
  args: { defaultValue: '1234' },
  play: async ({ canvasElement }) => {
    await userEvent.click(cell(canvasElement, 5));
    await userEvent.keyboard('{Backspace}');

    await expect(code(canvasElement)).toBe('123');
    await expect(cell(canvasElement, 4)).toHaveFocus();

    await userEvent.keyboard('{Backspace}{Backspace}');

    await expect(code(canvasElement)).toBe('1');
    await expect(cell(canvasElement, 2)).toHaveFocus();
  },
};

export const PasteWholeCode: Story = {
  name: 'Вставка всего кода',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(cell(canvasElement, 1));
    await userEvent.paste('987-654');

    await expect(code(canvasElement)).toBe('987654');
    await expect(cell(canvasElement, 6)).toHaveFocus();
    await expect(args.onComplete).toHaveBeenCalledWith('987654');
  },
};

export const NoGaps: Story = {
  name: 'Клик дальше заполненных — в первую пустую',
  args: { defaultValue: '12' },
  play: async ({ canvasElement }) => {
    await userEvent.click(cell(canvasElement, 6));

    await expectFocused(cell(canvasElement, 3));
  },
};

export const ArrowKeys: Story = {
  name: 'Стрелки и Home / End',
  args: { defaultValue: '1234' },
  play: async ({ canvasElement }) => {
    await userEvent.click(cell(canvasElement, 3));
    await userEvent.keyboard('{ArrowLeft}');
    await expect(cell(canvasElement, 2)).toHaveFocus();

    await userEvent.keyboard('{End}');
    await expect(cell(canvasElement, 5)).toHaveFocus();

    await userEvent.keyboard('{Home}9');
    await expect(code(canvasElement)).toBe('9234');
  },
};
