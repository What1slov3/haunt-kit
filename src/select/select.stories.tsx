import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Select } from '@haunt/ui';

import {
  clickOutside,
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface RegionSelectProps {
  /** 24 / 28 / 32 px — как у Input */
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  defaultValue?: string;
  invalid?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onValueChange?: (value: string) => void;
}

/** Выбор региона голосового сервера: группа с подписью, разделитель, выключенный пункт */
function RegionSelect({
  size,
  placeholder = 'Выберите регион',
  defaultValue,
  invalid,
  disabled,
  fullWidth,
  onValueChange,
}: RegionSelectProps) {
  return (
    <Select.Root defaultValue={defaultValue} disabled={disabled} onValueChange={onValueChange}>
      <Select.Trigger
        size={size}
        placeholder={placeholder}
        invalid={invalid}
        fullWidth={fullWidth}
        aria-label="Регион"
      />

      <Select.Content>
        <Select.Group>
          <Select.Label>Европа</Select.Label>
          <Select.Item value="eu">Франкфурт</Select.Item>
          <Select.Item value="nl">Амстердам</Select.Item>
        </Select.Group>

        <Select.Separator />

        <Select.Item value="us">Нью-Йорк</Select.Item>

        <Select.Item value="sg" disabled>
          Сингапур (скоро)
        </Select.Item>
      </Select.Content>
    </Select.Root>
  );
}

const meta = {
  title: 'Поля/Select',
  component: RegionSelect,
  subcomponents: {
    'Select.Trigger': Select.Trigger,
    'Select.Content': Select.Content,
    'Select.Item': Select.Item,
  },
  tags: ['autodocs'],
  args: { defaultValue: 'eu', size: 'md', onValueChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Выпадающий список с одним значением на Radix. Триггер — на рамке `Input`, внутри `Field` получает id и описание. Список под триггером той же ширины (`position="popper"`). Для поиска и множественного выбора нужен combobox — его в ките пока нет.',
      },
    },
  },
} satisfies Meta<typeof RegionSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

const trigger = (canvas: HTMLElement) => within(canvas).getByRole('combobox');
const listbox = () => screen().queryByRole('listbox');

export const Default: Story = {};

export const Placeholder: Story = {
  args: { defaultValue: undefined },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <RegionSelect {...args} size="sm" />
      <RegionSelect {...args} size="md" />
      <RegionSelect {...args} size="lg" />
    </div>
  ),
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: undefined },
  play: async ({ canvasElement }) => {
    await expect(trigger(canvasElement)).toHaveAttribute('aria-invalid', 'true');
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(trigger(canvasElement)).toBeDisabled();
  },
};

export const FullWidth: Story = {
  args: { fullWidth: true },
};

export const SelectsOption: Story = {
  name: 'Выбор пункта закрывает список',
  play: async ({ args, canvasElement }) => {
    const button = trigger(canvasElement);

    await expect(button).toHaveTextContent('Франкфурт');
    await userEvent.click(button);
    await expectVisible(await screen().findByRole('listbox'));

    await userEvent.click(screen().getByRole('option', { name: 'Амстердам' }));

    await expectGone(listbox);
    await expect(button).toHaveTextContent('Амстердам');
    await expectFocused(button);
    await expect(args.onValueChange).toHaveBeenCalledWith('nl');
  },
};

export const ClosesOnEscape: Story = {
  name: 'Закрывается по Esc',
  play: async ({ args, canvasElement }) => {
    const button = trigger(canvasElement);

    await userEvent.click(button);
    await expectVisible(await screen().findByRole('listbox'));

    await pressEscape();

    await expectGone(listbox);
    await expectFocused(button);
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

export const ClosesOnOutsideClick: Story = {
  name: 'Закрывается кликом снаружи',
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('listbox'));

    await clickOutside();

    await expectGone(listbox);
  },
};
