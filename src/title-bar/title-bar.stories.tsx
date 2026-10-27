import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Inbox, Search } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import {
  Icon,
  IconButton,
  Input,
  Kbd,
  Menubar,
  Stack,
  TitleBar,
  type TitleBarProps,
} from '@haunt/ui';

function AppMenu() {
  return (
    <Menubar.Root>
      <Menubar.Menu>
        <Menubar.Trigger>Файл</Menubar.Trigger>

        <Menubar.Content>
          <Menubar.Item shortcut="mod+n">Новое окно</Menubar.Item>
          <Menubar.Item shortcut="mod+,">Настройки</Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>

      <Menubar.Menu>
        <Menubar.Trigger>Вид</Menubar.Trigger>

        <Menubar.Content>
          <Menubar.Item shortcut="mod+b">Боковая панель</Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>
    </Menubar.Root>
  );
}

function Demo({ onMaximize, ...props }: Partial<TitleBarProps>) {
  const [maximized, setMaximized] = useState(false);

  return (
    <TitleBar
      title="Haunt — #общий"
      menu={<AppMenu />}
      search={
        <Input
          size="sm"
          placeholder="Поиск"
          aria-label="Поиск"
          startSlot={<Icon icon={Search} size="sm" />}
          endSlot={<Kbd size="sm">Ctrl+K</Kbd>}
        />
      }
      end={
        <IconButton label="Входящие" size="sm">
          <Icon icon={Inbox} size="sm" />
        </IconButton>
      }
      maximized={maximized}
      onMaximize={() => {
        onMaximize?.();
        setMaximized((value) => !value);
      }}
      {...props}
    />
  );
}

const meta = {
  title: 'Раскладка/TitleBar',
  component: Demo,
  tags: ['autodocs'],
  args: { onMinimize: fn(), onMaximize: fn(), onClose: fn(), platform: 'windows' },
  argTypes: { platform: { control: 'inline-radio', options: ['auto', 'mac', 'windows', 'linux'] } },
  decorators: [
    (Story) => (
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Своя шапка окна Tauri (`decorations: false`). Перетаскивание окна — атрибутом `data-tauri-drag-region` на фоне и заголовке (Tauri тянет, только если нажали прямо на элемент с атрибутом, — меню, поиск и кнопки внутри работают как обычно; двойной клик по фону разворачивает окно). Зависимости от Tauri нет: действия — пропсами (`onMinimize`, `onMaximize`, `onClose`; `getCurrentWindow()` вызывает приложение). Кнопки окна по платформе: macOS — «светофор» слева (знаки на наведении), Windows — прямоугольные справа (закрыть — красным), Linux — круглые справа. Слоты: `start`, `menu` (`Menubar`), `search`, `end`. `inactive` — окно не в фокусе.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Windows: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const maximize = canvas.getByRole('button', { name: 'Развернуть' });

    await userEvent.click(maximize);
    await expect(args.onMaximize).toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: 'Восстановить' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Закрыть' }));
    await expect(args.onClose).toHaveBeenCalled();

    // Перетаскивается фон и заголовок, а не меню и поиск
    const bar = canvasElement.querySelector('[data-platform]');

    await expect(bar).toHaveAttribute('data-tauri-drag-region');
    await expect(canvas.getByText('Haunt — #общий')).toHaveAttribute('data-tauri-drag-region');
    await expect(
      canvas.getByRole('textbox', { name: 'Поиск' }).closest('[data-tauri-drag-region]'),
    ).toBe(bar);
  },
};

export const Mac: Story = {
  name: 'macOS',
  args: { platform: 'mac' },
  play: async ({ args, canvasElement }) => {
    const group = within(canvasElement).getByRole('group', { name: 'Управление окном' });
    const buttons = within(group).getAllByRole('button');

    // «Светофор» — слева: первым в полосе, порядок закрыть / свернуть / развернуть
    await expect(canvasElement.querySelector('[data-platform]')?.firstElementChild).toBe(group);
    await expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Закрыть',
      'Свернуть',
      'Развернуть',
    ]);

    await userEvent.click(buttons[1] as HTMLElement);
    await expect(args.onMinimize).toHaveBeenCalled();
  },
};

export const Linux: Story = {
  args: { platform: 'linux' },
};

export const Inactive: Story = {
  name: 'Окно не в фокусе',
  args: { platform: 'mac', inactive: true },
};

export const WithoutControls: Story = {
  name: 'В браузере — без кнопок окна',
  args: { onMinimize: undefined, onMaximize: undefined, onClose: undefined, windowControls: false },
};

export const AllPlatforms: Story = {
  name: 'Три платформы рядом',
  render: (args) => (
    <Stack gap={0}>
      <Demo {...args} platform="mac" />
      <Demo {...args} platform="windows" />
      <Demo {...args} platform="linux" />
    </Stack>
  ),
};
