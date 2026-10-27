import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ShortcutList, type ShortcutGroup } from '@haunt/ui';

const groups: ShortcutGroup[] = [
  {
    heading: 'Навигация',
    items: [
      { label: 'Палитра команд', keys: ['mod+k', '/'] },
      { label: 'Следующий канал', keys: 'alt+down' },
      { label: 'Предыдущий канал', keys: 'alt+up' },
      { label: 'Непрочитанный канал', keys: 'alt+shift+down' },
    ],
  },
  {
    heading: 'Сообщения',
    items: [
      { label: 'Отправить', keys: 'enter' },
      { label: 'Новая строка', keys: 'shift+enter' },
      { label: 'Изменить последнее', keys: 'up' },
      { label: 'Жирный', keys: 'mod+b' },
      { label: 'Курсив', keys: 'mod+i' },
    ],
  },
  {
    heading: 'Голос',
    items: [
      { label: 'Выключить микрофон', keys: 'mod+shift+m' },
      { label: 'Выключить звук', keys: 'mod+shift+d' },
    ],
  },
];

const meta = {
  title: 'Отображение/ShortcutList',
  component: ShortcutList,
  tags: ['autodocs'],
  args: { groups, columns: 1, apple: false },
  argTypes: {
    groups: { control: false },
    columns: { control: 'inline-radio', options: [1, 2] },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Справка по клавишам (`?`): группы, строки «действие — клавиши», плотно (28 px), клавиши — `Kbd` моно. Сочетания — те же строки, что у `useHotkey` (`mod+k`), поэтому справка совпадает с поведением; `apple` по умолчанию берётся из платформы: на macOS — ⇧⌘K подряд, на остальных — Ctrl + Shift + K. Массив в `keys` — равноправные варианты.',
      },
    },
  },
} satisfies Meta<typeof ShortcutList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TwoColumns: Story = { args: { columns: 2 } };

export const Apple: Story = {
  name: 'Подписи macOS',
  args: { apple: true },
};

export const Structure: Story = {
  name: 'Группы — секции, строки — список определений',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const navigation = canvas.getByRole('region', { name: 'Навигация' });

    // Не getAllByRole('region'): тостер декоратора — тоже регион
    await expect(canvasElement.querySelectorAll('section')).toHaveLength(3);
    await expect(within(navigation).getAllByRole('term')).toHaveLength(4);

    const palette = within(navigation).getByText('Палитра команд')
      .nextElementSibling as HTMLElement;
    const keys = [...palette.querySelectorAll('kbd')].map((kbd) => kbd.textContent);

    await expect(keys).toEqual(['Ctrl', 'K', '/']);
    await expect(palette).toHaveTextContent('Ctrl+Kили/');
  },
};
