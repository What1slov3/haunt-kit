import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Field, Input, Link, Select, Switch, Textarea } from '@haunt/ui';

const meta = {
  title: 'Поля/Field',
  component: Field,
  tags: ['autodocs'],
  args: {
    label: 'Имя пользователя',
    hint: 'Видно всем участникам',
    children: <Input placeholder="например, vagner" fullWidth />,
  },
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    children: { control: false },
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
          'Метка + один контрол + подсказка или ошибка. Связывает их по id: контрол из кита (`Input`, `Textarea`, `Select.Trigger`) сам берёт id, `aria-describedby` и признак ошибки из контекста.',
      },
    },
  },
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Имя пользователя');

    await expect(input).toHaveAccessibleDescription('Видно всем участникам');

    await userEvent.click(canvas.getByText('Имя пользователя'));

    await expect(input).toHaveFocus();
  },
};

export const Required: Story = {
  args: { required: true },
};

export const WithError: Story = {
  args: {
    label: 'Почта',
    hint: undefined,
    error: 'Такой адрес уже занят',
    children: <Input type="email" defaultValue="me@haunt.app" fullWidth />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Почта');

    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription('Такой адрес уже занят');
    await expect(canvas.getByRole('alert')).toHaveTextContent('Такой адрес уже занят');
  },
};

export const Horizontal: Story = {
  args: {
    label: 'Ник',
    hint: undefined,
    horizontal: true,
    children: <Input placeholder="vagner" />,
  },
};

export const WithTextarea: Story = {
  args: {
    label: 'О себе',
    hint: 'До 190 символов',
    children: <Textarea placeholder="Пара слов о себе" fullWidth />,
  },
};

export const WithSelect: Story = {
  args: {
    label: 'Регион',
    hint: 'Сервер для голосовых каналов',
    children: (
      <Select.Root defaultValue="eu">
        <Select.Trigger fullWidth />

        <Select.Content>
          <Select.Item value="eu">Франкфурт</Select.Item>
          <Select.Item value="nl">Амстердам</Select.Item>
        </Select.Content>
      </Select.Root>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Регион')).toHaveRole('combobox');
  },
};

/** Switch несёт подпись сам — в Field ему метка не нужна, только подсказка */
export const WithSwitch: Story = {
  args: {
    label: undefined,
    hint: 'Сигнал при новом сообщении',
    children: <Switch label="Звук" />,
  },
};

/** `[опц.]` — когда обязательных полей в форме большинство */
export const Optional: Story = {
  args: { label: 'Статус', optional: true, hint: 'Под ником в списке участников' },
};

/** Справа в строке метки — ссылка или действие */
export const WithAside: Story = {
  args: {
    label: 'Пароль',
    hint: undefined,
    aside: <Link href="#forgot">забыли?</Link>,
    children: <Input type="password" defaultValue="haunt-secret" fullWidth />,
  },
};

function CounterField() {
  const [value, setValue] = useState('Играю по вечерам, собираю отряд на выходные');

  return (
    <Field label="О себе" hint="Видно в карточке профиля" count={value.length} maxLength={48}>
      <Textarea value={value} onChange={(event) => setValue(event.target.value)} fullWidth />
    </Field>
  );
}

/** Счётчик `12/190` моно: жёлтый с 90 % лимита, красный за пределом */
export const WithCounter: Story = {
  render: () => <CounterField />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 43 символа + 6 — на один больше лимита
    await userEvent.type(canvas.getByLabelText('О себе'), '!!!!!!');

    await expect(canvas.getByText('49 из 48 символов')).toBeInTheDocument();
    await expect(canvas.getByText('49/48').className).toMatch(/danger/);
  },
};

export const LongText: Story = {
  args: {
    label: 'Очень длинная метка поля, которая не помещается в одну строку узкой колонки',
    hint: 'И такая же длинная подсказка под полем: переносится по словам и не ломает раскладку формы',
  },
};
