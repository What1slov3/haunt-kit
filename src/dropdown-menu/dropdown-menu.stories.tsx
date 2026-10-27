import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button, DropdownMenu, Icon, IconButton } from '@haunt/ui';

import {
  clickOutside,
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface MessageMenuProps {
  /** Выбор пункта «Копировать» */
  onCopy?: () => void;
  defaultOpen?: boolean;
}

/** Меню сообщения — то же, что в мессенджере: пункты с иконками и шорткатами, флажок, подменю */
function MessageMenu({ onCopy, defaultOpen }: MessageMenuProps) {
  const [muted, setMuted] = useState(false);
  const [notify, setNotify] = useState('all');

  return (
    <DropdownMenu.Root defaultOpen={defaultOpen}>
      <DropdownMenu.Trigger asChild>
        <Button iconEnd={<Icon icon={MoreHorizontal} size="sm" />}>Меню</Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="start">
        <DropdownMenu.Label>Сообщение</DropdownMenu.Label>

        <DropdownMenu.Item icon={<Icon icon={Pencil} size="sm" />} shortcut="E">
          Изменить
        </DropdownMenu.Item>

        <DropdownMenu.Item
          icon={<Icon icon={Copy} size="sm" />}
          shortcut="Ctrl+C"
          onSelect={onCopy}
        >
          Копировать
        </DropdownMenu.Item>

        <DropdownMenu.CheckboxItem checked={muted} onCheckedChange={setMuted}>
          Без уведомлений
        </DropdownMenu.CheckboxItem>

        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger icon={<Icon icon={Bell} size="sm" />}>
            Уведомлять
          </DropdownMenu.SubTrigger>

          <DropdownMenu.SubContent>
            <DropdownMenu.RadioGroup value={notify} onValueChange={setNotify}>
              <DropdownMenu.RadioItem value="all">Обо всём</DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem value="mentions">Упоминания</DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <DropdownMenu.Separator />

        <DropdownMenu.Item icon={<Icon icon={Trash2} size="sm" />} danger>
          Удалить
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

const meta = {
  title: 'Всплывающее/DropdownMenu',
  component: MessageMenu,
  subcomponents: {
    'DropdownMenu.Content': DropdownMenu.Content,
    'DropdownMenu.Item': DropdownMenu.Item,
    'DropdownMenu.SubTrigger': DropdownMenu.SubTrigger,
  },
  tags: ['autodocs'],
  args: { onCopy: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Выпадающее меню на Radix: клавиатура, фокус и закрытие — из коробки. Стекло, пункты 28 px, шорткаты в `Kbd`. Порталится в хост `AccentScope` / `ThemeScope`, если он есть.',
      },
    },
  },
} satisfies Meta<typeof MessageMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const trigger = (canvas: HTMLElement) => within(canvas).getByRole('button', { name: 'Меню' });
const menu = () => screen().queryByRole('menu');

export const Default: Story = {};

/** Открыто сразу — чтобы рассмотреть пункты, флажок и подменю */
export const Open: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, height: '320px' } } },
};

export const ClosesOnEscape: Story = {
  name: 'Закрывается по Esc',
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('menu'));

    await pressEscape();

    await expectGone(menu);
    await expectFocused(trigger(canvasElement));
  },
};

export const ClosesOnOutsideClick: Story = {
  name: 'Закрывается кликом снаружи',
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await screen().findByRole('menu');

    await clickOutside();

    await expectGone(menu);
  },
};

export const ClosesOnSelect: Story = {
  name: 'Закрывается выбором пункта',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await userEvent.click(await screen().findByRole('menuitem', { name: /Копировать/ }));

    await expectGone(menu);
    await expectFocused(trigger(canvasElement));
    await expect(args.onCopy).toHaveBeenCalledOnce();

    await userEvent.click(trigger(canvasElement));

    await expectVisible(await screen().findByRole('menu'));
  },
};

export const Submenu: Story = {
  name: 'Подменю открывается по наведению',
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await userEvent.hover(await screen().findByRole('menuitem', { name: /Уведомлять/ }));

    await expectVisible(await screen().findByRole('menuitemradio', { name: 'Обо всём' }));
  },
};

/** Иконочный триггер в углу карточки: меню прижато к правому краю */
export const IconTrigger: Story = {
  render: () => (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton label="Ещё" variant="secondary">
          <Icon icon={MoreHorizontal} />
        </IconButton>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end">
        <DropdownMenu.Item icon={<Icon icon={Pencil} size="sm" />}>Переименовать</DropdownMenu.Item>

        <DropdownMenu.Item icon={<Icon icon={Trash2} size="sm" />} danger>
          Удалить
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  ),
};

export const LongItems: Story = {
  render: () => (
    <DropdownMenu.Root defaultOpen>
      <DropdownMenu.Trigger asChild>
        <Button>Каналы</Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="start" style={{ maxWidth: 240 }}>
        <DropdownMenu.Item>general</DropdownMenu.Item>
        <DropdownMenu.Item>
          очень-длинное-название-канала-которое-не-помещается-в-меню
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  ),
  parameters: { docs: { story: { inline: false, height: '200px' } } },
};
