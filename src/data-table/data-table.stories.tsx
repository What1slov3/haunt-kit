import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  Avatar,
  Badge,
  DataTable,
  EmptyState,
  Inline,
  Text,
  Timestamp,
  type DataTableColumn,
} from '@haunt/ui';

interface Member {
  id: string;
  name: string;
  role: string;
  messages: number | null;
  joined: Date;
}

const names = [
  'Мария Орлова',
  'Иван Лебедев',
  'Анна Соколова',
  'Пётр Волков',
  'Ольга Ким',
  'Денис Шах',
  'Лев Гарин',
  'Вера Нос',
  'Глеб Рыбин',
  'Юлия Дым',
  'Артём Лис',
  'Ника Сай',
];
const roles = ['owner', 'модератор', 'участник', 'участник', 'бот'];

const members: Member[] = names.map((name, index) => ({
  id: `m${index}`,
  name,
  role: roles[index % roles.length] ?? 'участник',
  // У бота сообщений не считаем — пустые значения при сортировке уходят в конец
  messages: index % roles.length === 4 ? null : ((index * 137) % 900) + 3,
  joined: new Date(2026, index % 9, 1 + ((index * 5) % 27)),
}));

const columns: DataTableColumn<Member>[] = [
  {
    key: 'name',
    header: 'Участник',
    sortable: true,
    cell: (row) => (
      <Inline gap={2}>
        <Avatar name={row.name} size="xs" />

        <Text truncate>{row.name}</Text>
      </Inline>
    ),
  },
  {
    key: 'role',
    header: 'Роль',
    sortable: true,
    width: 140,
    cell: (row) => (
      <Badge tone={row.role === 'owner' ? 'accent' : 'neutral'} bracket>
        {row.role}
      </Badge>
    ),
  },
  { key: 'messages', header: 'Сообщений', sortable: true, numeric: true, width: 120 },
  {
    key: 'joined',
    header: 'С нами с',
    sortable: true,
    width: 160,
    cell: (row) => (
      <Text tone="muted">
        <Timestamp date={row.joined} mode="date" tooltip={false} />
      </Text>
    ),
  },
];

const MemberTable = DataTable<Member>;

const meta = {
  title: 'Данные/DataTable',
  component: MemberTable,
  tags: ['autodocs'],
  args: {
    columns,
    rows: members,
    rowKey: (row) => row.id,
    density: 'default',
    stickyHeader: true,
    maxHeight: 280,
    label: 'Участники пространства',
  },
  argTypes: {
    columns: { control: false },
    rows: { control: false },
    rowKey: { control: false },
    density: { control: 'inline-radio', options: ['compact', 'default'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Таблица для админки: журнал аудита, роли, участники. Колонки — описанием (`key`, `header`, `cell`, `value`, `sortable`, `align`, `width`, `numeric`). Сортировка — кликом по заголовку (`aria-sort`), цикл «нет → ▲ → ▼ → нет», стабильная, пустые значения всегда в конце. Липкая шапка внутри `maxHeight`, плотность `compact` 28 / `default` 32, наведение и выбранная строка — токены `--state-*`, числовые колонки — моно. `virtual` — для тысяч строк: в DOM только окно, колонки фиксированы (`table-layout: fixed`) и не прыгают, шапка остаётся липкой, `aria-rowcount` / `aria-rowindex` у строк.',
      },
    },
  },
} satisfies Meta<typeof MemberTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
  args: { density: 'compact' },
};

export const Empty: Story = {
  args: { rows: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Нет данных')).toBeVisible();
  },
};

export const CustomEmpty: Story = {
  name: 'Своё пустое состояние',
  args: {
    rows: [],
    empty: (
      <EmptyState title="Никого не нашли" description="Измените фильтр или пригласите людей." />
    ),
  },
};

export const SortsByClick: Story = {
  name: 'Сортирует по клику, пустые — в конце',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const header = canvas.getByRole('columnheader', { name: /Сообщений/ });
    const button = within(header).getByRole('button');
    const firstCell = () => canvas.getAllByRole('row')[1]?.querySelectorAll('td')[2];
    const lastCell = () => canvas.getAllByRole('row').at(-1)?.querySelectorAll('td')[2];

    await expect(header).toHaveAttribute('aria-sort', 'none');

    await userEvent.click(button);
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await expect(firstCell()).toHaveTextContent('3');
    await expect(lastCell()).toHaveTextContent('—');

    await userEvent.click(button);
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await expect(lastCell()).toHaveTextContent('—');

    await userEvent.click(button);
    await expect(header).toHaveAttribute('aria-sort', 'none');
  },
};

function SelectableTable(props: Story['args']) {
  const [selected, setSelected] = useState<string | null>('m2');

  return (
    <MemberTable
      {...meta.args}
      {...props}
      selectedKey={selected}
      onRowClick={(row, index) => {
        setSelected(row.id);
        props?.onRowClick?.(row, index);
      }}
    />
  );
}

export const ClickableRows: Story = {
  name: 'Кликабельные строки и выбор',
  args: { onRowClick: fn() },
  render: (args) => <SelectableTable {...args} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole('row', { name: /Пётр Волков/ });

    await userEvent.click(row);
    await expect(args.onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Пётр Волков' }),
      expect.any(Number),
    );
    await expect(row).toHaveAttribute('data-selected');

    const next = canvas.getByRole('row', { name: /Ольга Ким/ });

    next.focus();
    await userEvent.keyboard('{Enter}');
    await expect(next).toHaveAttribute('data-selected');
    await expect(row).not.toHaveAttribute('data-selected');
  },
};

/* 5 000 участников: те же колонки, детерминированные значения */
const manyMembers: Member[] = Array.from({ length: 5000 }, (_, index) => ({
  id: `v${index}`,
  name: `${names[index % names.length]} ${index + 1}`,
  role: roles[index % roles.length] ?? 'участник',
  messages: index % roles.length === 4 ? null : ((index * 137) % 9000) + 3,
  joined: new Date(2026, index % 9, 1 + ((index * 5) % 27)),
}));

export const Virtual5000: Story = {
  name: 'Таблица 5 000 строк (virtual)',
  args: { rows: manyMembers, virtual: true, maxHeight: 360, density: 'compact' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole('table');
    const root = table.parentElement as HTMLElement;
    const header = canvas.getByRole('columnheader', { name: /Роль/ });
    const width = header.getBoundingClientRect().width;
    const bodyRows = () => table.querySelectorAll('tbody tr[aria-rowindex]');

    await expect(table).toHaveAttribute('aria-rowcount', '5001');
    await expect(bodyRows().length).toBeLessThan(60);

    root.scrollTop = root.scrollHeight;

    await waitFor(() => expect(canvas.getByText('Вера Нос 5000')).toBeVisible());
    await expect(bodyRows().length).toBeLessThan(60);
    await expect(bodyRows()[bodyRows().length - 1]).toHaveAttribute('aria-rowindex', '5001');

    // Шапка прилипла, ширина колонки не сдвинулась от новых строк
    await expect(header.getBoundingClientRect().top).toBeCloseTo(
      root.getBoundingClientRect().top + 1,
      0,
    );
    await expect(header.getBoundingClientRect().width).toBeCloseTo(width, 1);

    // Сортировка — снова с начала
    await userEvent.click(
      within(canvas.getByRole('columnheader', { name: /Сообщений/ })).getByRole('button'),
    );
    await waitFor(() => expect(root.scrollTop).toBe(0));
    await expect(bodyRows()[0]).toHaveAttribute('aria-rowindex', '2');
  },
};
