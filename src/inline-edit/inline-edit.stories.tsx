import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Heading, InlineEdit } from '@haunt/ui';

const channelName = (value: string) =>
  /^[a-z0-9-]+$/.test(value) ? null : 'Только латиница, цифры и дефис';

const meta = {
  title: 'Поля/InlineEdit',
  component: InlineEdit,
  tags: ['autodocs'],
  args: {
    defaultValue: 'general',
    validate: channelName,
    inputLabel: 'Название канала',
    onSave: fn(),
  },
  argTypes: { validate: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Текст, который правится на месте: название канала, тема, имя роли. Клик, Enter или F2 — правка; Enter и уход фокуса — сохранить, Esc — отменить (и не закрыть диалог вокруг). `validate` держит правку открытой с ошибкой. `onSave` может вернуть промис: рядом спиннер и уже новое значение, отказ — откат и ошибка. Шрифт родителя: внутри `Heading` поле того же кегля. Текст в покое целиком, режется многоточием только краем контейнера; предел — `maxChars` (символов) или `maxWidth` (px или CSS-длина, `24ch`). Полный текст — в подсказке, когда он обрезан, и в подписи для скринридера; в правке поле показывает всё.',
      },
    },
  },
} satisfies Meta<typeof InlineEdit>;

export default meta;

type Story = StoryObj<typeof meta>;

const display = (canvas: HTMLElement) => within(canvas).getByRole('button');
const field = (canvas: HTMLElement) =>
  within(canvas).getByRole('textbox', { name: 'Название канала' });

export const Default: Story = {};

export const InHeading: Story = {
  name: 'В заголовке',
  render: (args) => (
    <Heading size="lg">
      # <InlineEdit {...args} />
    </Heading>
  ),
};

const longName = 'обсуждаем-дизайн-новой-страницы-пространства-и-лор-про-вечерние-созвоны';

const textOf = (canvas: HTMLElement) => display(canvas).querySelector('span') as HTMLElement;

export const Short: Story = {
  name: 'Короткое — целиком',
  play: async ({ canvasElement }) => {
    const text = textOf(canvasElement);

    // Раньше кнопка была на 8 px уже текста — многоточие даже у короткого слова
    await expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
  },
};

export const LongInNarrow: Story = {
  name: 'Длинное — до края контейнера',
  args: { defaultValue: longName },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const text = textOf(canvasElement);

    await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
    await expect(text.getBoundingClientRect().width).toBeGreaterThan(220);
    // Скринридер слышит всё название, не обрезок
    await expect(display(canvasElement).getAttribute('aria-label')).toContain(longName);
  },
};

export const MaxChars: Story = {
  name: 'maxChars — по числу символов',
  args: { defaultValue: longName, maxChars: 24 },
  play: async ({ canvasElement }) => {
    await expect(textOf(canvasElement)).toHaveTextContent('обсуждаем-дизайн-новой-с…');

    // В правке — всё значение целиком
    await userEvent.click(display(canvasElement));
    await expect(field(canvasElement)).toHaveValue(longName);
  },
};

export const MaxWidth: Story = {
  name: 'maxWidth — по ширине',
  args: { defaultValue: longName, maxWidth: '24ch' },
  play: async ({ canvasElement }) => {
    const text = textOf(canvasElement);
    const limit = Number.parseFloat(getComputedStyle(text).maxWidth);

    await expect(text.getBoundingClientRect().width).toBeLessThanOrEqual(limit + 0.5);
    await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
  },
};

export const Empty: Story = {
  args: { defaultValue: '', placeholder: 'Добавьте тему канала', validate: undefined },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const EnterSaves: Story = {
  name: 'Enter сохраняет, фокус возвращается',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(display(canvasElement));
    await expect(field(canvasElement)).toHaveFocus();

    await userEvent.keyboard('{Control>}a{/Control}releases{Enter}');

    await expect(args.onSave).toHaveBeenCalledWith('releases');
    await expect(display(canvasElement)).toHaveTextContent('releases');
    await expect(display(canvasElement)).toHaveFocus();
  },
};

export const EscapeCancels: Story = {
  name: 'F2 открывает, Esc отменяет',
  play: async ({ args, canvasElement }) => {
    display(canvasElement).focus();
    await userEvent.keyboard('{F2}');
    await userEvent.keyboard('{Control>}a{/Control}другое{Escape}');

    await expect(display(canvasElement)).toHaveTextContent('general');
    await expect(args.onSave).not.toHaveBeenCalled();
  },
};

export const BlurSaves: Story = {
  name: 'Уход фокуса сохраняет',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(display(canvasElement));
    await userEvent.keyboard('{End}-chat');
    await userEvent.click(document.body);

    await expect(args.onSave).toHaveBeenCalledOnce();
    await expect(args.onSave).toHaveBeenCalledWith('general-chat');
  },
};

export const Validation: Story = {
  name: 'Ошибка проверки держит правку',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(display(canvasElement));
    await userEvent.keyboard('{Control>}a{/Control}Новый канал{Enter}');

    const input = field(canvasElement);

    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('Только латиница');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription('Только латиница, цифры и дефис');
    await expect(args.onSave).not.toHaveBeenCalled();
  },
};

export const AsyncSave: Story = {
  name: 'Сохранение с ожиданием',
  args: { onSave: fn(() => new Promise<void>((resolve) => setTimeout(resolve, 400))) },
  play: async ({ canvasElement }) => {
    await userEvent.click(display(canvasElement));
    await userEvent.keyboard('{Control>}a{/Control}design{Enter}');

    await expect(display(canvasElement)).toHaveTextContent('design');
    await expect(
      within(canvasElement).getByRole('status', { name: 'Сохранение' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(canvasElement).queryByRole('status')).toBeNull());
  },
};

export const RejectedSave: Story = {
  name: 'Отказ: откат и ошибка',
  args: {
    onSave: fn(
      () =>
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Канал с таким именем уже есть')), 150),
        ),
    ),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(display(canvasElement));
    await userEvent.keyboard('{Control>}a{/Control}random{Enter}');

    await expect(display(canvasElement)).toHaveTextContent('random');
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent(
      'Канал с таким именем уже есть',
    );
    await expect(display(canvasElement)).toHaveTextContent('general');
  },
};
