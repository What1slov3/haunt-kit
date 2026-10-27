import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Field, Input, PasswordStrength, Stack, type PasswordStrengthProps } from '@haunt/ui';

const meta = {
  title: 'Поля/PasswordStrength',
  component: PasswordStrength,
  tags: ['autodocs'],
  args: { password: 'summer2024' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Шкала надёжности пароля на `Meter` (пять делений, тон по порогам) и подсказки «что улучшить». Оценка — `scorePassword`, чистая функция без внешних словарей: длина, классы символов, повторы, последовательности (в том числе `qwerty` и `йцукен`), частые пароли из встроенного списка, имя и почта (`userInputs`). Связь с полем — `id` шкалы в `aria-describedby`; смена уровня объявляется скринридеру.',
      },
    },
  },
} satisfies Meta<typeof PasswordStrength>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Fair: Story = {};

export const Common: Story = {
  name: 'Частый пароль',
  args: { password: 'P@ssw0rd2024' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('meter')).toHaveAttribute('aria-valuetext', 'очень слабый');
    await expect(canvas.getByRole('list', { name: 'Как усилить пароль' })).toHaveTextContent(
      'Похож на частый пароль',
    );
  },
};

export const TooShort: Story = {
  name: 'Короткий',
  args: { password: 'Kx9#', minLength: 10 },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/Слишком короткий — нужно от 10 символов/),
    ).toBeInTheDocument();
  },
};

export const Strong: Story = {
  name: 'Надёжный',
  args: { password: 'Тихий-маяк-над-водой-7' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('meter')).toHaveAttribute('aria-valuetext', 'надёжный');
    await expect(canvas.queryByRole('list')).toBeNull();
  },
};

export const Empty: Story = {
  name: 'Пустой — скрыт',
  args: { password: '' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('meter')).toBeNull();
  },
};

function SignUp(props: PasswordStrengthProps) {
  const [password, setPassword] = useState('');

  return (
    <Stack gap={1.5}>
      <Field label="Пароль">
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="password-strength"
          autoComplete="new-password"
          fullWidth
        />
      </Field>

      <PasswordStrength
        {...props}
        id="password-strength"
        password={password}
        userInputs={['vagner@haunt.app']}
      />
    </Stack>
  );
}

export const InSignUp: Story = {
  name: 'В регистрации',
  render: (args) => <SignUp {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Пароль'), 'vagner123');

    await expect(canvas.getByRole('list')).toHaveTextContent('Без имени, ника и почты');

    await userEvent.clear(canvas.getByLabelText('Пароль'));
    await userEvent.type(canvas.getByLabelText('Пароль'), 'correct horse battery staple');

    await expect(canvas.getByRole('meter')).toHaveAttribute('aria-valuetext', 'надёжный');
  },
};
