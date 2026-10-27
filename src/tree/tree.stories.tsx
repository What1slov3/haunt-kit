import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hash, Volume2 } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Badge, Icon, Tree, type TreeItem } from '@haunt/ui';

import { chartFrame } from '../lib/stories/data-frame';

const text = (id: string, meta?: number): TreeItem => ({
  id,
  label: id,
  icon: <Icon icon={Hash} size="sm" />,
  meta: meta ? <Badge size="sm">{meta}</Badge> : undefined,
});

const voice = (id: string): TreeItem => ({
  id,
  label: id,
  icon: <Icon icon={Volume2} size="sm" />,
});

const channels: TreeItem[] = [
  {
    id: 'cat-text',
    label: 'Текстовые каналы',
    children: [text('general', 3), text('games'), text('memes', 12), text('help')],
  },
  {
    id: 'cat-voice',
    label: 'Голосовые',
    children: [voice('lounge'), voice('raid'), voice('afk')],
  },
  { id: 'cat-empty', label: 'Новая категория', children: [] },
  { id: 'cat-archive', label: 'Архив', hasChildren: true },
  text('rules'),
];

function Controlled(props: Partial<Parameters<typeof Tree>[0]>) {
  const [items, setItems] = useState(channels);

  return (
    <Tree
      label="Каналы"
      items={items}
      defaultExpanded={['cat-text', 'cat-voice']}
      defaultSelected={['general']}
      onMove={(_, next) => setItems(next)}
      onLoadChildren={async (id) => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, children: [text('old-news'), text('2025')] } : item,
          ),
        );
      }}
      {...props}
    />
  );
}

const meta = {
  title: 'Данные/Tree',
  component: Tree,
  tags: ['autodocs'],
  args: { label: 'Каналы', items: channels, onActivate: fn(), onSelectedChange: fn() },
  argTypes: { items: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ ...chartFrame, maxWidth: 320, padding: 'var(--space-1)' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Общее дерево по WAI-ARIA tree: ↑↓ — строки, → — раскрыть / к первому ребёнку, ← — свернуть / к родителю, Home / End, `*` — раскрыть соседей, набор букв — поиск. Выделение `none | single | multiple` (Ctrl, Shift, Пробел, Ctrl+A). Ленивые ветки — `hasChildren` + `onLoadChildren`. Перетаскивание (порядок и вложенность — категории каналов) и его клавиатурная замена Alt + стрелки — при `onMove`; второй аргумент — дерево после перемещения. Больше 200 строк и задана `height` — рисуются только видимые (движок `VirtualList`). Модель — чистые функции `tree-model.ts`.',
      },
    },
  },
} satisfies Meta<typeof Tree>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Controlled onActivate={args.onActivate} onSelectedChange={args.onSelectedChange} />
  ),
};

export const Keyboard: Story = {
  name: 'Клавиатура WAI-ARIA',
  render: (args) => <Controlled onActivate={args.onActivate} />,
  play: async ({ canvasElement, args }) => {
    const tree = within(canvasElement).getByRole('tree', { name: 'Каналы' });
    const active = () => canvasElement.querySelector('[data-active]')?.getAttribute('data-tree-id');

    tree.focus();
    await waitFor(() => expect(active()).toBe('cat-text'));
    await userEvent.keyboard('{ArrowDown}');
    await expect(active()).toBe('general');
    await userEvent.keyboard('{ArrowLeft}');
    await expect(active()).toBe('cat-text');
    await userEvent.keyboard('{ArrowLeft}');
    await expect(
      within(canvasElement).getByRole('treeitem', { name: 'Текстовые каналы' }),
    ).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('m');
    await expect(active()).toBe('memes');
    await userEvent.keyboard('{Enter}');
    await expect(args.onActivate).toHaveBeenCalledWith('memes');
    await userEvent.keyboard('{End}');
    await expect(active()).toBe('rules');
  },
};

export const KeyboardMove: Story = {
  name: 'Перемещение Alt + стрелки',
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    const order = () =>
      [...canvasElement.querySelectorAll('[data-tree-row]')].map((row) =>
        row.getAttribute('data-tree-id'),
      );

    tree.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    await expect(order().slice(0, 3)).toEqual(['cat-text', 'games', 'general']);
    await waitFor(() =>
      expect(canvasElement.querySelector('[aria-live="polite"]')?.textContent).toMatch(/games/),
    );
  },
};

export const Lazy: Story = {
  name: 'Ленивая ветка',
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const archive = within(canvasElement).getByRole('treeitem', { name: 'Архив' });

    await userEvent.click(archive.querySelector('[aria-hidden]')!);
    await waitFor(() => expect(archive).toHaveAttribute('aria-busy', 'true'));
    await waitFor(
      () =>
        expect(
          within(canvasElement).getByRole('treeitem', { name: 'old-news' }),
        ).toBeInTheDocument(),
      {
        timeout: 3000,
      },
    );
  },
};

export const Multiple: Story = {
  name: 'Несколько выделенных',
  args: { selectionMode: 'multiple' },
  render: (args) => (
    <Controlled selectionMode="multiple" onSelectedChange={args.onSelectedChange} />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('treeitem', { name: 'games' }));
    await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}');
    await expect(args.onSelectedChange).toHaveBeenLastCalledWith(['games', 'memes', 'help']);
  },
};

const big: TreeItem[] = Array.from({ length: 40 }, (_, group) => ({
  id: `group-${group}`,
  label: `Категория ${group + 1}`,
  children: Array.from({ length: 25 }, (_, index) => text(`канал-${group + 1}-${index + 1}`)),
}));

export const Virtualized: Story = {
  name: 'Тысяча строк — виртуализация',
  args: {
    items: big,
    defaultExpanded: big.map((item) => item.id),
    height: 360,
    label: 'Большое дерево',
  },
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll('[role="treeitem"]');

    await expect(rows.length).toBeLessThan(120);

    const tree = within(canvasElement).getByRole('tree');

    tree.focus();
    await userEvent.keyboard('{End}');
    await waitFor(() =>
      expect(
        within(canvasElement).getByRole('treeitem', { name: 'канал-40-25' }),
      ).toBeInTheDocument(),
    );
  },
};
