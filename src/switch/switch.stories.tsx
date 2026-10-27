import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Stack, Surface, Switch } from '@haunt/ui';

const meta = {
  title: 'Поля/Switch',
  component: Switch,
  tags: ['autodocs'],
  args: { label: 'Уведомления', onCheckedChange: fn() },
  argTypes: {
    label: { control: 'text' },
    description: { control: 'text' },
  },
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
          'Компактный переключатель 30×16. В строке настроек подпись слева и кликабельна, контрол прижат вправо. `checked` / `defaultChecked` / `onCheckedChange` — как у Radix Switch.',
      },
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const control = within(canvasElement).getByRole('switch', { name: 'Уведомления' });

    await expect(control).not.toBeChecked();
    await userEvent.click(control);
    await expect(control).toBeChecked();

    // Подпись — тоже часть контрола: клик по ней переключает обратно
    await userEvent.click(within(canvasElement).getByText('Уведомления'));
    await expect(control).not.toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenCalledTimes(2);

    control.focus();
    await userEvent.keyboard(' ');
    await expect(control).toBeChecked();
  },
};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const WithDescription: Story = {
  args: { label: 'Звук', description: 'Сигнал при новом сообщении' },
};

export const Disabled: Story = {
  args: { label: 'Выключен', disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('switch')).toBeDisabled();
  },
};

export const WithoutLabel: Story = {
  args: { label: undefined, 'aria-label': 'Микрофон' },
};

/** Список настроек: подписи слева, переключатели в одну колонку справа */
export const SettingsList: Story = {
  render: () => (
    <Surface level={2} p={3}>
      <Stack gap={1}>
        <Switch label="Уведомления" defaultChecked />
        <Switch label="Звук" description="Сигнал при новом сообщении" />
        <Switch
          label="Показывать превью ссылок в сообщениях с очень длинным названием настройки"
          defaultChecked
        />
        <Switch label="Выключен" disabled />
      </Stack>
    </Surface>
  ),
};
