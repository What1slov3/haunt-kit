import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Copy, Pin, Reply, Trash2 } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ContextMenu, Icon, Surface, Text } from '@haunt/ui';

import {
  clickOutside,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface MessageContextMenuProps {
  /** Выбор пункта «Закрепить» */
  onPin?: () => void;
}

/** Контекстное меню сообщения: правый клик по плашке */
function MessageContextMenu({ onPin }: MessageContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <Surface level={2} px={3} py={1.5} radius="md" style={{ display: 'inline-block' }}>
          <Text size="sm" tone="muted">
            Правый клик здесь
          </Text>
        </Surface>
      </ContextMenu.Trigger>

      <ContextMenu.Content>
        <ContextMenu.Label>Сообщение</ContextMenu.Label>

        <ContextMenu.Item icon={<Icon icon={Reply} size="sm" />} shortcut="R">
          Ответить
        </ContextMenu.Item>

        <ContextMenu.Item icon={<Icon icon={Copy} size="sm" />}>Копировать текст</ContextMenu.Item>

        <ContextMenu.Item icon={<Icon icon={Pin} size="sm" />} onSelect={onPin}>
          Закрепить
        </ContextMenu.Item>

        <ContextMenu.CheckboxItem checked>Следить за ответами</ContextMenu.CheckboxItem>

        <ContextMenu.Sub>
          <ContextMenu.SubTrigger icon={<Icon icon={Bell} size="sm" />}>
            Уведомлять
          </ContextMenu.SubTrigger>

          <ContextMenu.SubContent>
            <ContextMenu.Item>Обо всём</ContextMenu.Item>
            <ContextMenu.Item>Только упоминания</ContextMenu.Item>
          </ContextMenu.SubContent>
        </ContextMenu.Sub>

        <ContextMenu.Separator />

        <ContextMenu.Item icon={<Icon icon={Trash2} size="sm" />} danger shortcut="Del">
          Удалить
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}

const meta = {
  title: 'Всплывающее/ContextMenu',
  component: MessageContextMenu,
  subcomponents: {
    'ContextMenu.Content': ContextMenu.Content,
    'ContextMenu.Item': ContextMenu.Item,
    'ContextMenu.SubTrigger': ContextMenu.SubTrigger,
  },
  tags: ['autodocs'],
  args: { onPin: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Контекстное меню по правой кнопке (и долгому нажатию на тач-экране). Стили общие с `DropdownMenu` (`menu/menu.module.css`). Открывается у курсора; фокус после закрытия остаётся на странице — триггера-кнопки нет.',
      },
    },
  },
} satisfies Meta<typeof MessageContextMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const area = (canvas: HTMLElement) => within(canvas).getByText('Правый клик здесь');
const menu = () => screen().queryByRole('menu');

async function openMenu(canvas: HTMLElement) {
  await userEvent.pointer({ keys: '[MouseRight]', target: area(canvas) });
  await expectVisible(await screen().findByRole('menu'));
}

export const Default: Story = {};

export const ClosesOnEscape: Story = {
  name: 'Открывается правым кликом, закрывается по Esc',
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);

    await pressEscape();

    await expectGone(menu);
  },
};

export const ClosesOnOutsideClick: Story = {
  name: 'Закрывается кликом снаружи',
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);

    await clickOutside();

    await expectGone(menu);
  },
};

export const ClosesOnSelect: Story = {
  name: 'Закрывается выбором пункта',
  play: async ({ args, canvasElement }) => {
    await openMenu(canvasElement);

    await userEvent.click(screen().getByRole('menuitem', { name: 'Закрепить' }));

    await expectGone(menu);
    await expect(args.onPin).toHaveBeenCalledOnce();
  },
};

export const Submenu: Story = {
  name: 'Подменю открывается по наведению',
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);

    await userEvent.hover(screen().getByRole('menuitem', { name: /Уведомлять/ }));

    await expectVisible(await screen().findByRole('menuitem', { name: 'Только упоминания' }));
  },
};
