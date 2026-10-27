import { useRef, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hash, Inbox, Plus, Volume2 } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  BrowserTabs,
  Icon,
  IconButton,
  moveItem,
  Stack,
  Text,
  type BrowserTab,
  type BrowserTabsProps,
} from '@haunt/ui';

import { expectGone, expectVisible, screen } from '../lib/stories/play-helpers';

const initialTabs: BrowserTab[] = [
  {
    id: 'inbox',
    label: 'Входящие',
    icon: <Icon icon={Inbox} size="sm" />,
    pinned: true,
    unread: 3,
  },
  { id: 'general', label: 'общий', icon: <Icon icon={Hash} size="sm" /> },
  { id: 'news', label: 'новости', icon: <Icon icon={Hash} size="sm" />, unread: true },
  { id: 'design', label: 'дизайн-система и всё про кит', icon: <Icon icon={Hash} size="sm" /> },
  { id: 'voice', label: 'Голос', icon: <Icon icon={Volume2} size="sm" />, unread: 12 },
];

const manyTabs: BrowserTab[] = [
  ...initialTabs,
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `extra-${index}`,
    label: `канал-${index + 1}`,
    icon: <Icon icon={Hash} size="sm" />,
  })),
];

type DemoProps = Partial<BrowserTabsProps> & { initial?: BrowserTab[] };

/** Владелец вкладок: порядок, открытая и закрытие — состояние экрана, полоса только сообщает */
function Demo({ initial = initialTabs, onClose, onReorder, ...props }: DemoProps) {
  const [tabs, setTabs] = useState(initial);
  const [value, setValue] = useState<string | null>('general');
  const scope = useRef<HTMLDivElement>(null);
  const active = tabs.find((tab) => tab.id === value);

  return (
    <div ref={scope} style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
      <BrowserTabs
        tabs={tabs}
        value={value}
        onValueChange={setValue}
        onClose={(id) => {
          onClose?.(id);
          setTabs((current) => current.filter((tab) => tab.id !== id));
        }}
        onReorder={(from, to) => {
          onReorder?.(from, to);
          setTabs((current) => moveItem(current, from, to));
        }}
        hotkeyScope={scope}
        actions={
          <IconButton label="Новая вкладка" size="sm">
            <Icon icon={Plus} size="sm" />
          </IconButton>
        }
        {...props}
      />

      <Stack p={4} gap={2} style={{ background: 'var(--panel-3)', minHeight: 120 }}>
        <Text weight="semibold">{active ? active.label : '—'}</Text>

        <input aria-label="Композер" placeholder="Сообщение" />
      </Stack>
    </div>
  );
}

const meta = {
  title: 'Списки/BrowserTabs',
  component: Demo,
  tags: ['autodocs'],
  args: { onClose: fn(), onReorder: fn() },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 760 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Вкладки открытых каналов, как в браузере. Данные — массивом `tabs`, состояние — у владельца (`value`, `onClose`, `onReorder` + `moveItem`). Крестик и средняя кнопка мыши закрывают; закрытая открытая вкладка передаёт фокус соседке справа. Перетаскивание порядка — по образцу `SortableList`, внутри группы: закреплённые (узкие, только иконка) всегда в начале. Не влезли — полоса прокручивается колесом, края затухают, справа меню «все вкладки». Клавиатура: стрелки / Home / End — по вкладкам, Enter — открыть, Delete — закрыть, Ctrl+Shift+←/→ — переставить; Ctrl+Tab / Ctrl+Shift+Tab / Ctrl+W — когда фокус внутри `hotkeyScope` (в обычной вкладке браузера их забирает браузер — сочетания для окна Tauri). Непрочитанное — точка или счётчик.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tab = canvas.getByRole('tab', { name: /новости/ });

    await userEvent.click(tab);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(
      canvas.getByRole('tab', { name: 'Входящие, закреплена, 3 непрочитанных' }),
    ).toBeVisible();
  },
};

export const Keyboard: Story = {
  name: 'Клавиатура',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const general = canvas.getByRole('tab', { name: 'общий' });

    general.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('tab', { name: /новости/ })).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('tab', { name: /новости/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Ctrl+Shift+→ переставляет вкладку, фокус едет вместе с ней
    await userEvent.keyboard('{Control>}{Shift>}{ArrowRight}{/Shift}{/Control}');
    await expect(args.onReorder).toHaveBeenCalledWith(2, 3);
    await expect(canvas.getByRole('tab', { name: /новости/ })).toHaveFocus();

    await userEvent.keyboard('{Delete}');
    await expect(args.onClose).toHaveBeenCalledWith('news');
    await waitFor(() => expect(canvas.queryByRole('tab', { name: /новости/ })).toBeNull());
    await expect(canvas.getByRole('tab', { name: 'Голос, 12 непрочитанных' })).toHaveFocus();
  },
};

export const Hotkeys: Story = {
  name: 'Ctrl+Tab и Ctrl+W в зоне',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const composer = canvas.getByRole('textbox', { name: 'Композер' });

    await userEvent.click(composer);
    await userEvent.keyboard('{Control>}{Tab}{/Control}');
    await expect(canvas.getByRole('tab', { name: /новости/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(composer).toHaveFocus();

    await userEvent.keyboard('{Control>}{Shift>}{Tab}{/Shift}{/Control}');
    await expect(canvas.getByRole('tab', { name: 'общий' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await userEvent.keyboard('{Control>}w{/Control}');
    await expect(args.onClose).toHaveBeenCalledWith('general');
    await expect(canvas.getByRole('tab', { name: /новости/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
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

export const MiddleClick: Story = {
  name: 'Средняя кнопка закрывает',
  play: async ({ args, canvasElement }) => {
    const tab = within(canvasElement).getByRole('tab', { name: /дизайн-система/ });

    tab.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
    await expect(args.onClose).toHaveBeenCalledWith('design');
  },
};

export const DragToReorder: Story = {
  name: 'Перетаскивание',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const general = canvas.getByRole('tab', { name: 'общий' });
    const from = general.getBoundingClientRect();
    const to = canvas.getByRole('tab', { name: /Голос/ }).getBoundingClientRect();
    const y = from.top + from.height / 2;
    const x = from.left + 20;

    pointer('pointerdown', general, x, y);
    pointer('pointermove', window, x + 10, y);
    pointer('pointermove', window, x + (to.left - from.left) + 40, y);

    // Соседи уступили место: вторая обычная вкладка сдвинулась влево
    await waitFor(() => expect(general.parentElement).toHaveAttribute('data-dragging'));

    pointer('pointerup', window, x + (to.left - from.left) + 40, y);

    await waitFor(() => expect(args.onReorder).toHaveBeenCalledWith(1, 4));
    // Закреплённая осталась первой: обычную нельзя утащить в её группу
    await expect(canvas.getAllByRole('tab')[0]).toHaveAccessibleName(/Входящие/);
  },
};

export const Overflow: Story = {
  name: 'Переполнение: меню «все вкладки»',
  args: { initial: manyTabs },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const menu = await canvas.findByRole('button', { name: 'Все вкладки' });

    await userEvent.click(menu);

    const item = await screen().findByRole('menuitemradio', { name: 'канал-10' });

    await expectVisible(item);
    await userEvent.click(item);
    // Модальное меню снимает aria-hidden с остальной страницы, только когда закроется
    await expectGone(() => screen().queryByRole('menu'));
    await expect(canvas.getByRole('tab', { name: 'канал-10' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};
