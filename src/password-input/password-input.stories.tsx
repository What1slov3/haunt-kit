import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Button, Field, PasswordInput, PasswordStrength, Stack } from '@haunt/ui';

const meta = {
  title: 'Поля/PasswordInput',
  component: PasswordInput,
  tags: ['autodocs'],
  args: { 'aria-label': 'Пароль', fullWidth: true, onVisibleChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Поле пароля: `Input` в рамке поля и кнопка «показать / скрыть» в `endSlot`. Кнопка не берёт Tab — с клавиатуры показ по **Alt+F8** (как у поля пароля Windows), фокус и каретка остаются в поле, смена объявляется скринридеру. Пока включён Caps Lock — метка тоном предупреждения (читается `getModifierState` на нажатиях в поле). `autoComplete` по умолчанию `current-password`, для регистрации — `new-password`. Внутри `<Field>` связан с меткой и ошибкой; надёжность — `PasswordStrength` рядом через `aria-describedby`.',
      },
    },
  },
} satisfies Meta<typeof PasswordInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { defaultValue: 'hunter2' } };

export const Small: Story = { args: { size: 'sm', defaultValue: 'hunter2' } };

export const Large: Story = { args: { size: 'lg', defaultValue: 'hunter2' } };

export const Invalid: Story = { args: { invalid: true, defaultValue: 'hunter2' } };

export const Disabled: Story = { args: { disabled: true, defaultValue: 'hunter2' } };

export const Shows: Story = {
  name: 'Показ кнопкой',
  args: { defaultValue: 'тихий-маяк' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText<HTMLInputElement>('Пароль');

    await expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(input);
    await userEvent.click(canvas.getByRole('button', { name: 'Показать пароль' }));

    await expect(input).toHaveAttribute('type', 'text');
    await expect(canvas.getByRole('button', { name: 'Скрыть пароль' })).toBeInTheDocument();
    // Фокус не ушёл на кнопку: можно продолжать печатать
    await expect(input).toHaveFocus();
    await expect(args.onVisibleChange).toHaveBeenLastCalledWith(true);
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('Пароль показан'));

    await userEvent.click(canvas.getByRole('button', { name: 'Скрыть пароль' }));

    await expect(input).toHaveAttribute('type', 'password');
  },
};

export const KeyboardToggle: Story = {
  name: 'Показ по Alt+F8, кнопка вне Tab',
  render: (args) => (
    <Stack gap={2}>
      <PasswordInput {...args} />
      <Button variant="primary">Войти</Button>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Пароль');

    await userEvent.tab();
    await expect(input).toHaveFocus();

    await userEvent.keyboard('{Alt>}{F8}{/Alt}');
    await expect(input).toHaveAttribute('type', 'text');

    await userEvent.keyboard('{Alt>}{F8}{/Alt}');
    await expect(input).toHaveAttribute('type', 'password');

    // Следующая остановка Tab — кнопка формы, а не «показать»
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Войти' })).toHaveFocus();
  },
};

/**
 * Нажатие с заданным Caps Lock. userEvent хранит его у себя, а `getModifierState` настоящего события Chromium
 * читает из `modifierCapsLock` — поэтому событие собирается вручную
 */
function pressWithCapsLock(target: Element, key: string, capsLock: boolean) {
  for (const type of ['keydown', 'keyup']) {
    target.dispatchEvent(
      new KeyboardEvent(type, { key, bubbles: true, cancelable: true, modifierCapsLock: capsLock }),
    );
  }
}

export const CapsLock: Story = {
  name: 'Предупреждение Caps Lock',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Пароль');

    await userEvent.click(input);
    pressWithCapsLock(input, 'A', true);

    await waitFor(() => expect(canvas.getByText('Caps Lock')).toBeVisible());
    await expect(canvas.getByRole('status')).toHaveTextContent('Включён Caps Lock');

    pressWithCapsLock(input, 'b', false);

    await waitFor(() => expect(canvas.queryByText('Caps Lock')).toBeNull());
  },
};

export const Controlled: Story = {
  name: 'Управляемый показ',
  render: function Render(args) {
    const [visible, setVisible] = useState(true);

    return (
      <Stack gap={2}>
        <PasswordInput {...args} defaultValue="hunter2" visible={visible} />
        <Button size="sm" onClick={() => setVisible((value) => !value)}>
          {visible ? 'Скрыть снаружи' : 'Показать снаружи'}
        </Button>
      </Stack>
    );
  },
};

function SignUp() {
  const [password, setPassword] = useState('');

  return (
    <Stack gap={1.5}>
      <Field label="Новый пароль" hint="Не короче 10 символов">
        <PasswordInput
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          aria-describedby="sign-up-strength"
          fullWidth
        />
      </Field>

      <PasswordStrength
        id="sign-up-strength"
        password={password}
        minLength={10}
        userInputs={['vagner@haunt.app']}
      />
    </Stack>
  );
}

export const WithStrength: Story = {
  name: 'С PasswordStrength',
  render: () => <SignUp />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Новый пароль');

    await expect(input).toHaveAttribute('autocomplete', 'new-password');

    await userEvent.type(input, 'correct horse battery staple');

    await expect(canvas.getByRole('meter')).toHaveAttribute('aria-valuetext', 'надёжный');
  },
};

export const InField: Story = {
  name: 'В Field с ошибкой',
  args: { 'aria-label': undefined },
  render: (args) => (
    <Field label="Пароль" error="Неверный пароль">
      <PasswordInput {...args} defaultValue="hunter2" />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Пароль');

    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAttribute('autocomplete', 'current-password');
    await expect(input).toHaveAccessibleDescription(/Неверный пароль/);
  },
};
