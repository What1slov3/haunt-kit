import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Checkbox, Stack } from '@haunt/ui';

const meta = {
  title: 'Поля/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: { label: 'Показывать статус', onCheckedChange: fn() },
  argTypes: {
    label: { control: 'text' },
    description: { control: 'text' },
    checked: { control: 'inline-radio', options: [true, false, 'indeterminate'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Флажок на Radix. `checked` принимает `true | false | "indeterminate"`; с `label` строка целиком кликабельна. Для «вкл/выкл» настройки удобнее `Switch`, флажок — для выбора из списка.',
      },
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByRole('checkbox', { name: 'Показывать статус' });

    await userEvent.click(box);
    await expect(box).toBeChecked();

    await userEvent.click(canvas.getByText('Показывать статус'));
    await expect(box).not.toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenLastCalledWith(false);
  },
};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Indeterminate: Story = {
  args: { label: 'Частично', checked: 'indeterminate' },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox');

    await expect(box).toHaveAttribute('aria-checked', 'mixed');
    await expect(box).toHaveAttribute('data-state', 'indeterminate');
  },
};

export const WithDescription: Story = {
  args: { label: 'Сжимать картинки', description: 'Быстрее грузятся, но теряют в качестве' },
};

export const Disabled: Story = {
  args: { label: 'Выключен', disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('checkbox')).toBeDisabled();
  },
};

export const LongLabel: Story = {
  args: {
    label: 'Присылать письмо, если меня упомянули, а я не заходил в приложение больше суток подряд',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
};

const channels = ['general', 'design', 'rust'];

/** «Выбрать все»: родитель indeterminate, пока выбрана часть списка */
export const SelectAll: Story = {
  render: function SelectAllStory() {
    const [selected, setSelected] = useState<string[]>(['general']);
    const all = selected.length === channels.length;

    return (
      <Stack gap={2}>
        <Checkbox
          label="Все каналы"
          checked={all ? true : selected.length > 0 ? 'indeterminate' : false}
          onCheckedChange={() => setSelected(all ? [] : channels)}
        />

        <Stack gap={1.5} pl={5}>
          {channels.map((channel) => (
            <Checkbox
              key={channel}
              label={`#${channel}`}
              checked={selected.includes(channel)}
              onCheckedChange={(next) =>
                setSelected((current) =>
                  next === true ? [...current, channel] : current.filter((c) => c !== channel),
                )
              }
            />
          ))}
        </Stack>
      </Stack>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const parent = canvas.getByRole('checkbox', { name: 'Все каналы' });

    await expect(parent).toHaveAttribute('aria-checked', 'mixed');

    await userEvent.click(parent);
    await expect(parent).toBeChecked();
    await expect(canvas.getByRole('checkbox', { name: '#rust' })).toBeChecked();

    await userEvent.click(canvas.getByRole('checkbox', { name: '#rust' }));
    await expect(parent).toHaveAttribute('aria-checked', 'mixed');
  },
};
