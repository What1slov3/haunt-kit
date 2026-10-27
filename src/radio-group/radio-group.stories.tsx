import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { RadioGroup } from '@haunt/ui';

interface NotifyRadioProps {
  defaultValue?: string;
  /** Пункты в ряд */
  horizontal?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}

/** Настройка уведомлений: три пункта, у одного — пояснение */
function NotifyRadio({
  defaultValue = 'all',
  horizontal,
  disabled,
  onValueChange,
}: NotifyRadioProps) {
  return (
    <RadioGroup.Root
      defaultValue={defaultValue}
      horizontal={horizontal}
      disabled={disabled}
      onValueChange={onValueChange}
      aria-label="Уведомлять"
    >
      <RadioGroup.Item value="all" label="Обо всех сообщениях" />
      <RadioGroup.Item value="mentions" label="Только упоминания" description="@me и @роль" />
      <RadioGroup.Item value="none" label="Никогда" />
    </RadioGroup.Root>
  );
}

const meta = {
  title: 'Поля/RadioGroup',
  component: NotifyRadio,
  subcomponents: { 'RadioGroup.Root': RadioGroup.Root, 'RadioGroup.Item': RadioGroup.Item },
  tags: ['autodocs'],
  args: { onValueChange: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Группа радиокнопок на Radix: стрелки двигают выбор, Tab входит в группу один раз. У пункта — `label` и необязательный `description`; строка целиком кликабельна.',
      },
    },
  },
} satisfies Meta<typeof NotifyRadio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const all = canvas.getByRole('radio', { name: 'Обо всех сообщениях' });
    const mentions = canvas.getByRole('radio', { name: /Только упоминания/ });
    const none = canvas.getByRole('radio', { name: 'Никогда' });

    await expect(all).toBeChecked();

    await userEvent.click(canvas.getByText('Только упоминания'));
    await expect(mentions).toBeChecked();
    await expect(args.onValueChange).toHaveBeenLastCalledWith('mentions');

    // Клик по подписи не переводит фокус на кружок, а стрелки работают от сфокусированного
    await userEvent.click(mentions);

    /*
     * Стрелка вниз — следующий пункт, с последнего — по кругу на первый. Клавиша держится до проверки:
     * Radix выбирает пункт в onFocus, только пока стрелка нажата, а фокус переводит в setTimeout —
     * мгновенный keyup от userEvent успевал бы раньше.
     */
    await userEvent.keyboard('{ArrowDown>}');
    await waitFor(() => expect(none).toBeChecked());
    await userEvent.keyboard('{/ArrowDown}');
    await expect(none).toHaveFocus();

    await userEvent.keyboard('{ArrowDown>}');
    await waitFor(() => expect(all).toBeChecked());
    await userEvent.keyboard('{/ArrowDown}');
  },
};

export const Horizontal: Story = {
  args: { horizontal: true },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    for (const radio of within(canvasElement).getAllByRole('radio')) {
      await expect(radio).toBeDisabled();
    }
  },
};

export const LongLabels: Story = {
  render: () => (
    <div style={{ maxWidth: 280 }}>
      <RadioGroup.Root defaultValue="a" aria-label="Хранение истории">
        <RadioGroup.Item
          value="a"
          label="Хранить всю историю сообщений канала без ограничений по сроку"
          description="Поиск находит даже самые старые сообщения, но база растёт"
        />
        <RadioGroup.Item value="b" label="Год" />
      </RadioGroup.Root>
    </div>
  ),
};
