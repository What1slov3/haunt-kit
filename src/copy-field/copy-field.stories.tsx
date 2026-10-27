import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, spyOn, userEvent, waitFor, within } from 'storybook/test';

import { CopyField, Field } from '@haunt/ui';

const meta = {
  title: 'Поля/CopyField',
  component: CopyField,
  tags: ['autodocs'],
  args: {
    value: 'https://haunt.app/i/8f3k2',
    'aria-label': 'Ссылка-приглашение',
    onCopy: fn(),
  },
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
          'Значение только для чтения с `CopyButton` в рамке поля: ссылка-приглашение, id сообщества, токен бота. Моно по умолчанию; фокус выделяет текст целиком — можно скопировать и с клавиатуры. Кнопка прижата к краю на том же отступе, что сверху и снизу, скругление концентрично рамке. Внутри `<Field>` связан с меткой и подсказкой, как `Input`.',
      },
    },
  },
} satisfies Meta<typeof CopyField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { fullWidth: true } };

export const Small: Story = { args: { size: 'sm', value: '1180427736218', 'aria-label': 'id' } };

export const Large: Story = { args: { size: 'lg', fullWidth: true } };

export const Disabled: Story = { args: { disabled: true, fullWidth: true } };

export const InField: Story = {
  args: { 'aria-label': undefined, fullWidth: true },
  render: (args) => (
    <Field label="Приглашение" hint="Действует 7 дней">
      <CopyField {...args} />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Приглашение');

    await expect(input).toHaveAttribute('readonly');
    await expect(input).toHaveAccessibleDescription('Действует 7 дней');
  },
};

export const SelectsOnFocus: Story = {
  name: 'Фокус выделяет всё',
  args: { fullWidth: true },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole<HTMLInputElement>('textbox', {
      name: 'Ссылка-приглашение',
    });

    await userEvent.tab();

    await expect(input).toHaveFocus();
    await expect(input.selectionStart).toBe(0);
    await expect(input.selectionEnd).toBe(input.value.length);
  },
};

export const Copies: Story = {
  name: 'Кнопка копирует значение',
  args: { fullWidth: true },
  play: async ({ args, canvasElement }) => {
    // Буфер обмена в headless Chromium без разрешения отказывает — подменяем запись
    const write = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Копировать' }));

    await expect(write).toHaveBeenCalledWith(args.value);
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Скопировано' })).toBeVisible());

    write.mockRestore();
  },
};
