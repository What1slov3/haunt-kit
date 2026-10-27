import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Field, TagInput } from '@haunt/ui';

const meta = {
  title: 'Поля/TagInput',
  component: TagInput,
  tags: ['autodocs'],
  args: {
    defaultValue: ['модератор', 'ветеран'],
    placeholder: 'Добавить роль',
    'aria-label': 'Роли',
    onValueChange: fn(),
  },
  argTypes: {
    validate: { control: false },
    removeLabel: { control: false },
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
          'Теги-чипы внутри рамки поля и ввод за ними: роли участника, приглашения по нику. Enter и запятая добавляют, Backspace на пустом вводе снимает последний, вставка «a, b, c» добавляет списком. Дубль (без учёта регистра) не добавляется — уже стоящий тег вспыхивает. `max` ограничивает число, `validate` возвращает текст ошибки — он под полем с TUI-знаком `!` до следующего ввода. В одну строку высота как у `Input`, теги переносятся и поле растёт.',
      },
    },
  },
} satisfies Meta<typeof TagInput>;

export default meta;

type Story = StoryObj<typeof meta>;

const input = (canvas: HTMLElement) => within(canvas).getByRole('textbox', { name: 'Роли' });
const tagTexts = (canvas: HTMLElement) =>
  within(canvas)
    .queryAllByRole('listitem')
    .map((item) => item.textContent);

export const Default: Story = {};

export const Empty: Story = {
  args: { defaultValue: [] },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const Wrapping: Story = {
  name: 'Много тегов — перенос',
  args: {
    defaultValue: [
      'модератор',
      'ветеран',
      'стример',
      'художник',
      'бот',
      'очень длинная роль участника',
    ],
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(input(canvasElement)).toBeDisabled();
  },
};

export const InField: Story = {
  args: { 'aria-label': undefined },
  render: (args) => (
    <Field label="Пригласить" hint="Ники через запятую">
      <TagInput {...args} defaultValue={[]} placeholder="@ник" fullWidth />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Пригласить');

    await expect(field).toHaveAccessibleDescription('Ники через запятую');
  },
};

export const AddAndRemove: Story = {
  name: 'Enter и запятая добавляют, Backspace снимает',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(input(canvasElement));
    await userEvent.keyboard('стример{Enter}бот,');

    await expect(tagTexts(canvasElement)).toEqual(['модератор', 'ветеран', 'стример', 'бот']);
    await expect(input(canvasElement)).toHaveValue('');

    await userEvent.keyboard('{Backspace}');

    await expect(tagTexts(canvasElement)).toEqual(['модератор', 'ветеран', 'стример']);
    await expect(args.onValueChange).toHaveBeenLastCalledWith(['модератор', 'ветеран', 'стример']);
  },
};

export const RemoveButton: Story = {
  name: 'Крестик снимает тег',
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Снять «модератор»' }));

    await expect(tagTexts(canvasElement)).toEqual(['ветеран']);
    await expect(input(canvasElement)).toHaveFocus();
  },
};

export const NoDuplicates: Story = {
  name: 'Дубль не добавляется',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(input(canvasElement));
    await userEvent.keyboard('Модератор{Enter}');

    await expect(tagTexts(canvasElement)).toEqual(['модератор', 'ветеран']);
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

export const PasteList: Story = {
  name: 'Вставка списка через запятую',
  args: { defaultValue: [] },
  play: async ({ canvasElement }) => {
    await userEvent.click(input(canvasElement));
    await userEvent.paste('@anna, @boris; @anna\n@vera');

    await expect(tagTexts(canvasElement)).toEqual(['@anna', '@boris', '@vera']);
  },
};

export const MaxTags: Story = {
  name: 'Лимит',
  args: { max: 3 },
  play: async ({ canvasElement }) => {
    await userEvent.click(input(canvasElement));
    await userEvent.keyboard('стример{Enter}бот{Enter}');

    await expect(tagTexts(canvasElement)).toEqual(['модератор', 'ветеран', 'стример']);
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('Не больше 3');
    await expect(input(canvasElement)).toHaveValue('бот');
  },
};

export const Validation: Story = {
  name: 'Валидация',
  args: {
    defaultValue: ['@anna'],
    placeholder: '@ник',
    'aria-label': 'Роли',
    validate: (tag) => (tag.startsWith('@') ? null : `«${tag}» — не ник: начните с @`),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(input(canvasElement));
    await userEvent.keyboard('boris{Enter}');

    const alert = within(canvasElement).getByRole('alert');

    await expect(alert).toHaveTextContent('«boris» — не ник: начните с @');
    await expect(input(canvasElement)).toHaveAttribute('aria-invalid', 'true');
    await expect(input(canvasElement)).toHaveAccessibleDescription('«boris» — не ник: начните с @');

    // Правка текста снимает ошибку
    await userEvent.keyboard('{Home}@');

    await expect(within(canvasElement).queryByRole('alert')).toBeNull();
  },
};
