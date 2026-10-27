import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Textarea } from '@haunt/ui';

const meta = {
  title: 'Поля/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    placeholder: 'Сообщение…',
    fullWidth: true,
    'aria-label': 'Сообщение',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Многострочное поле на той же рамке, что `Input`. `autoGrow` растит его по содержимому до 12 строк через `field-sizing` (Chromium / WebView2), `bare` снимает рамку — для композера внутри `FieldFrame`.',
      },
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AutoGrow: Story = {
  args: { autoGrow: true, rows: 1, placeholder: 'Растёт по мере набора' },
  play: async ({ canvasElement }) => {
    const textarea = within(canvasElement).getByRole('textbox');
    const before = textarea.getBoundingClientRect().height;

    await userEvent.type(
      textarea,
      'первая{Shift>}{Enter}{/Shift}вторая{Shift>}{Enter}{/Shift}третья',
    );

    await expect(textarea.getBoundingClientRect().height).toBeGreaterThan(before);
  },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: 'Слишком длинное описание' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('textbox')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Редактирование закрыто' },
};

export const LongText: Story = {
  args: {
    rows: 4,
    defaultValue:
      'Очень длинное сообщение с длинной ссылкой https://haunt.app/spaces/very/long/path/that/would/otherwise/overflow, которое переносится по словам и не раздвигает колонку. Ещё одна строка, чтобы появилась прокрутка внутри поля, если текста больше, чем строк.',
  },
};
