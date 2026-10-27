import { useState, type ReactNode } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hash, Volume2 } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Badge, Button, Icon, moveItem, SortableList, Text } from '@haunt/ui';

interface Channel {
  id: string;
  name: string;
  voice?: boolean;
}

const channels: Channel[] = [
  { id: 'c1', name: 'announcements' },
  { id: 'c2', name: 'general' },
  { id: 'c3', name: 'memes' },
  { id: 'c4', name: 'voice', voice: true },
  { id: 'c5', name: 'offtopic' },
];

interface Role {
  id: string;
  name: string;
  color: string;
  members: number;
}

const roles: Role[] = [
  { id: 'r1', name: 'Владелец', color: 'var(--accent)', members: 1 },
  { id: 'r2', name: 'Модераторы', color: 'var(--info)', members: 4 },
  { id: 'r3', name: 'Боты', color: 'var(--warning)', members: 3 },
  { id: 'r4', name: 'Участники', color: 'var(--success)', members: 128 },
];

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  minHeight: 'var(--row-compact)',
  padding: '0 var(--space-2)',
  fontSize: 'var(--text-md)',
  color: 'var(--text-muted)',
};

function ChannelRow({ channel, handle }: { channel: Channel; handle: ReactNode }) {
  return (
    <div style={rowStyle}>
      {handle}

      <Icon icon={channel.voice ? Volume2 : Hash} size="sm" />

      <span>{channel.name}</span>
    </div>
  );
}

/** Список хранит порядок сам — так, как его хранил бы экран: onReorder + moveItem */
function ChannelsDemo({
  onReorder,
  count = channels.length,
}: {
  onReorder: (from: number, to: number) => void;
  count?: number;
}) {
  const [items, setItems] = useState(() =>
    count === channels.length
      ? channels
      : Array.from({ length: count }, (_, index) => ({
          id: `l${index}`,
          name: `канал-${index + 1}`,
        })),
  );

  return (
    <SortableList
      items={items}
      getKey={(channel) => channel.id}
      getLabel={(channel) => channel.name}
      label="Каналы"
      onReorder={(from, to) => {
        setItems((current) => moveItem(current, from, to));
        onReorder(from, to);
      }}
      renderItem={(channel, { handle }) => <ChannelRow channel={channel} handle={handle} />}
    />
  );
}

function RolesDemo({
  onReorder,
  onEdit,
}: {
  onReorder: (from: number, to: number) => void;
  onEdit: (role: string) => void;
}) {
  const [items, setItems] = useState(roles);

  return (
    <SortableList
      handle
      items={items}
      getKey={(role) => role.id}
      getLabel={(role) => role.name}
      label="Роли"
      onReorder={(from, to) => {
        setItems((current) => moveItem(current, from, to));
        onReorder(from, to);
      }}
      renderItem={(role, { handle }) => (
        <div
          style={{
            ...rowStyle,
            minHeight: 'var(--row-default)',
            paddingLeft: 'var(--space-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--card)',
            color: 'var(--text)',
          }}
        >
          {handle}

          <span
            aria-hidden
            style={{ width: 10, height: 10, borderRadius: '50%', background: role.color }}
          />

          <Text truncate style={{ flex: 1 }}>
            {role.name}
          </Text>

          <Badge size="sm">{role.members}</Badge>

          <Button size="sm" variant="ghost" onClick={() => onEdit(role.name)}>
            Изменить
          </Button>
        </div>
      )}
    />
  );
}

const ChannelList = SortableList<Channel>;

const meta = {
  title: 'Списки/SortableList',
  component: ChannelList,
  tags: ['autodocs'],
  args: {
    items: channels,
    getKey: (channel: Channel) => channel.id,
    getLabel: (channel: Channel) => channel.name,
    renderItem: () => null,
    onReorder: fn(),
  },
  argTypes: {
    items: { control: false },
    getKey: { control: false },
    getLabel: { control: false },
    renderItem: { control: false },
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
          'Перетаскиваемый список: порядок каналов, ролей. Pointer-события, а не HTML5 drag-and-drop — тот не стилизуется и не работает пальцем. Тянется вся строка или только ручка (`handle`: строка остаётся кликабельной, палец прокручивает список); поднятая строка — стекло и тень, «призрак» показывает место, соседи раздвигаются transform-ами, у края контейнер прокручивается сам. Клавиатура по WAI-ARIA: Пробел / Enter — взять, стрелки, Home / End — двигать, Пробел / Enter — положить, Esc — отменить; каждый ход объявляется скринридеру («Взято: general, позиция 2 из 5»). `onReorder(from, to)` — порядок меняет владелец списка, помощник — `moveItem`.',
      },
    },
  },
} satisfies Meta<typeof ChannelList>;

export default meta;

type Story = StoryObj<typeof meta>;

const status = (canvas: HTMLElement) => within(canvas).getByRole('status');
/* У listitem нет имени из содержимого — строку ищем по тексту */
const rowNamed = (canvas: HTMLElement, name: string) =>
  within(canvas)
    .getAllByRole('listitem')
    .find((row) => row.textContent === name) as HTMLElement;

const names = (canvas: HTMLElement) =>
  within(canvas)
    .getAllByRole('listitem')
    .map((row) => row.textContent);

export const Channels: Story = {
  name: 'Каналы: тянется вся строка',
  render: (args) => <ChannelsDemo onReorder={args.onReorder} />,
};

export const KeyboardReorder: Story = {
  name: 'Клавиатура: взять, сдвинуть, положить',
  render: (args) => <ChannelsDemo onReorder={args.onReorder} />,
  play: async ({ args, canvasElement }) => {
    const row = rowNamed(canvasElement, 'general');

    row.focus();
    await userEvent.keyboard(' ');
    await expect(status(canvasElement)).toHaveTextContent('Взято: general, позиция 2 из 5');

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(status(canvasElement)).toHaveTextContent('general: позиция 4 из 5');

    await userEvent.keyboard('{Enter}');
    await expect(args.onReorder).toHaveBeenCalledWith(1, 3);
    await expect(status(canvasElement)).toHaveTextContent('Положено: general, позиция 4 из 5');
    await expect(names(canvasElement)).toEqual([
      'announcements',
      'memes',
      'voice',
      'general',
      'offtopic',
    ]);

    // Фокус остался на перенесённой строке — можно продолжать
    await waitFor(() => expect(rowNamed(canvasElement, 'general')).toHaveFocus());
  },
};

export const KeyboardCancel: Story = {
  name: 'Esc отменяет перенос',
  render: (args) => <ChannelsDemo onReorder={args.onReorder} />,
  play: async ({ args, canvasElement }) => {
    const row = rowNamed(canvasElement, 'memes');

    row.focus();
    await userEvent.keyboard(' {ArrowUp}{ArrowUp}{Escape}');

    await expect(args.onReorder).not.toHaveBeenCalled();
    await expect(status(canvasElement)).toHaveTextContent(
      'Отменено: memes остаётся на позиции 3 из 5',
    );
    await expect(names(canvasElement)[2]).toBe('memes');
  },
};

function pointer(type: string, target: EventTarget, clientX: number, clientY: number) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 7,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX,
      clientY,
    }),
  );
}

export const PointerReorder: Story = {
  name: 'Мышью: строка едет, соседи раздвигаются',
  render: (args) => <ChannelsDemo onReorder={args.onReorder} />,
  play: async ({ args, canvasElement }) => {
    const rows = within(canvasElement).getAllByRole('listitem');
    const first = rows[0] as HTMLElement;
    const box = first.getBoundingClientRect();
    const step = (rows[1] as HTMLElement).getBoundingClientRect().top - box.top;
    const x = box.left + 40;
    const y = box.top + box.height / 2;

    pointer('pointerdown', first, x, y);
    pointer('pointermove', window, x, y + 10);
    pointer('pointermove', window, x, y + step * 2 + 4);

    // Поднята, соседи уступили место, «призрак» на месте третьей строки
    await waitFor(() => expect(first).toHaveAttribute('data-dragging'));
    await expect(status(canvasElement)).toHaveTextContent('Взято: announcements, позиция 1 из 5');
    await expect((rows[1] as HTMLElement).style.transform).toBe(`translateY(${-step}px)`);

    pointer('pointerup', window, x, y + step * 2 + 4);

    await waitFor(() => expect(args.onReorder).toHaveBeenCalledWith(0, 2));
    await expect(names(canvasElement)).toEqual([
      'general',
      'memes',
      'announcements',
      'voice',
      'offtopic',
    ]);
  },
};

export const ClickIsNotDrag: Story = {
  name: 'Короткое нажатие — не перетаскивание',
  render: (args) => <ChannelsDemo onReorder={args.onReorder} />,
  play: async ({ args, canvasElement }) => {
    const row = within(canvasElement).getAllByRole('listitem')[1] as HTMLElement;
    const box = row.getBoundingClientRect();

    pointer('pointerdown', row, box.left + 20, box.top + 10);
    pointer('pointermove', window, box.left + 21, box.top + 11);
    pointer('pointerup', window, box.left + 21, box.top + 11);

    await expect(row).not.toHaveAttribute('data-dragging');
    await expect(args.onReorder).not.toHaveBeenCalled();
  },
};

export const Roles: Story = {
  name: 'Роли: тянется за ручку, кнопки в строке работают',
  args: { onReorder: fn() },
  render: (args) => <RolesDemo onReorder={args.onReorder} onEdit={fn()} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const handle = canvas.getByRole('button', { name: 'Перетащить: Боты' });

    handle.focus();
    await userEvent.keyboard('{Enter}{Home}{Enter}');

    await expect(args.onReorder).toHaveBeenCalledWith(2, 0);
    await expect(canvas.getAllByRole('listitem')[0]).toHaveTextContent('Боты');
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Перетащить: Боты' })).toHaveFocus(),
    );
  },
};

export const RoleEditClick: Story = {
  name: 'Клик по кнопке в строке не начинает перенос',
  render: function Render(args) {
    const [edited, setEdited] = useState('');

    return (
      <>
        <RolesDemo onReorder={args.onReorder} onEdit={setEdited} />

        <Text size="sm" tone="subtle">
          {edited && `Изменить: ${edited}`}
        </Text>
      </>
    );
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getAllByRole('button', { name: 'Изменить' })[1] as HTMLElement);
    await expect(canvas.getByText('Изменить: Модераторы')).toBeVisible();
    await expect(args.onReorder).not.toHaveBeenCalled();
  },
};

export const LongListAutoScroll: Story = {
  name: 'Длинный список: автопрокрутка у края',
  render: (args) => (
    <div
      style={{
        height: 240,
        overflowY: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-1)',
      }}
    >
      <ChannelsDemo onReorder={args.onReorder} count={30} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector('[style*="overflow-y"]') as HTMLElement;
    const first = within(canvasElement).getAllByRole('listitem')[0] as HTMLElement;
    const box = first.getBoundingClientRect();
    const edge = scroller.getBoundingClientRect().bottom - 4;

    pointer('pointerdown', first, box.left + 30, box.top + 8);
    pointer('pointermove', window, box.left + 30, box.top + 20);
    pointer('pointermove', window, box.left + 30, edge);

    // Курсор у нижнего края — контейнер прокручивается сам
    await waitFor(() => expect(scroller.scrollTop).toBeGreaterThan(60));

    pointer('pointerup', window, box.left + 30, edge);
  },
};

export const Disabled: Story = {
  render: (args) => (
    <SortableList
      disabled
      items={channels}
      getKey={(channel) => channel.id}
      getLabel={(channel) => channel.name}
      onReorder={args.onReorder}
      renderItem={(channel, { handle }) => <ChannelRow channel={channel} handle={handle} />}
    />
  ),
  play: async ({ args, canvasElement }) => {
    const row = within(canvasElement).getAllByRole('listitem')[0] as HTMLElement;

    await expect(row).toHaveAttribute('tabindex', '-1');

    row.focus();
    await userEvent.keyboard(' {ArrowDown} ');
    await expect(args.onReorder).not.toHaveBeenCalled();
  },
};
