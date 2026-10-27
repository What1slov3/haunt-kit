import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { TuiTable, type TuiTableColumn } from '@haunt/ui';

interface Channel {
  id: string;
  name: string;
  messages: number;
  owner: string;
}

const channels: Channel[] = [
  { id: '7f3a', name: 'general', messages: 1204, owner: 'Мария' },
  { id: 'c21', name: 'announcements', messages: 18, owner: 'haunt-mod' },
  { id: '0b9e', name: 'дизайн-система', messages: 342, owner: 'Иван' },
  { id: '5d10', name: '日本語', messages: 7, owner: 'Аня 👻' },
];

const columns: TuiTableColumn<Channel>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Канал' },
  { key: 'messages', header: 'Сообщ.', align: 'right' },
  { key: 'owner', header: 'Владелец' },
];

const meta = {
  title: 'TUI/TuiTable',
  component: TuiTable<Channel>,
  tags: ['autodocs'],
  args: { columns, rows: channels, label: 'Каналы', getRowKey: (row: Channel) => row.id },
  argTypes: { columns: { control: false }, rows: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Таблица символами: `┌─┬─┐`, `│`, `├─┼─┤`, моно. Колонки выровнены по ширине в знаках — чистая функция `columnWidths` (эмодзи и иероглифы — две клетки, комбинирующие — ноль), `width` / `minWidth` / `maxWidth` у колонки, `maxWidth` у таблицы — предел вместе с рамкой: широкие колонки сужаются, текст обрезается «…» (полный — в `title`). Числа — `align: "right"`. Рамка — те же знаки и CSS-повтор, что у `BoxFrame` (`variant`). Ячейки — ARIA-таблица, линии от скринридера скрыты. При `data-tui="off"` — тонкие рамки кита, моно и выравнивание остаются.',
      },
    },
  },
} satisfies Meta<typeof TuiTable<Channel>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const table = within(canvasElement).getByRole('table', { name: 'Каналы' });
    const rows = within(table).getAllByRole('row');

    await expect(rows).toHaveLength(5);
    await expect(within(rows[0] as HTMLElement).getAllByRole('columnheader')).toHaveLength(4);

    // Колонки ровные: ячейки одной колонки — одной ширины в разных строках
    const widths = rows.map(
      (row) =>
        row.querySelectorAll('[role="cell"], [role="columnheader"]')[1]?.getBoundingClientRect()
          .width,
    );

    await expect(new Set(widths).size).toBe(1);
  },
};

export const Narrow: Story = {
  name: 'Предел ширины',
  args: { maxWidth: 40 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('announc…')).toBeVisible();
  },
};

export const Double: Story = {
  name: 'Двойная рамка, линии между строками',
  args: { variant: 'double', rowSeparators: true },
};

export const Rounded: Story = {
  name: 'Скруглённая',
  args: { variant: 'rounded' },
};

export const Empty: Story = {
  name: 'Пусто',
  args: { rows: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Нет строк')).toBeVisible();
  },
};

export const TuiOff: Story = {
  name: 'Без TUI',
  globals: { tui: 'off' },
};
