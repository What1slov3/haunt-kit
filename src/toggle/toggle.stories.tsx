import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mic, MicOff, Pin } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Icon, Toggle } from '@haunt/ui';

const meta = {
  title: 'Кнопки/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  args: {
    label: 'Микрофон',
    size: 'md',
    children: <Icon icon={Mic} />,
    onPressedChange: fn(),
  },
  argTypes: {
    children: { control: false },
    pressed: { control: 'boolean', description: 'Нажата (контролируемо)' },
    defaultPressed: { control: 'boolean', description: 'Нажата при монтировании' },
    disabled: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Кнопка-переключатель состояния: «микрофон выключен», «закрепить панель». Нажатое состояние — `aria-pressed` и `data-state="on"`, стили из токенов `--state-selected-*`. Только иконка — передайте `label`.',
      },
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

const toggle = (canvas: HTMLElement, name = 'Микрофон') =>
  within(canvas).getByRole('button', { name });

export const Off: Story = {
  play: async ({ args, canvasElement }) => {
    const button = toggle(canvasElement);

    await expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);

    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveAttribute('data-state', 'on');
    await expect(args.onPressedChange).toHaveBeenLastCalledWith(true);

    await userEvent.click(button);

    await expect(button).toHaveAttribute('data-state', 'off');
  },
};

export const On: Story = {
  args: { defaultPressed: true },
};

export const Keyboard: Story = {
  name: 'Переключается пробелом',
  args: { label: 'Микрофон выключен', children: <Icon icon={MicOff} /> },
  play: async ({ canvasElement }) => {
    const button = toggle(canvasElement, 'Микрофон выключен');

    await userEvent.tab();
    await expect(button).toHaveFocus();

    await userEvent.keyboard(' ');
    await expect(button).toHaveAttribute('aria-pressed', 'true');

    await userEvent.keyboard('{Enter}');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  },
};

/** С текстом вместо иконки `label` не нужен — подпись видна */
export const WithText: Story = {
  args: {
    label: undefined,
    size: 'sm',
    children: (
      <>
        <Icon icon={Pin} size="sm" /> Закрепить
      </>
    ),
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(toggle(canvasElement)).toBeDisabled();
  },
};
