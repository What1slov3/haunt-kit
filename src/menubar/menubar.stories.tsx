import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, FilePlus, FolderOpen, LogOut, Save, Scissors } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Icon, Input, Menubar } from '@haunt/ui';

import {
  clickOutside,
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface WindowMenuProps {
  /** Выбор «Сохранить» */
  onSave?: () => void;
  /** Alt / F10 — вход в полосу */
  altFocus?: boolean;
}

/** Меню окна Haunt в Tauri: Файл / Правка / Вид / Окно / Справка */
function WindowMenu({ onSave, altFocus }: WindowMenuProps) {
  const [sidebar, setSidebar] = useState(true);
  const [members, setMembers] = useState(false);
  const [density, setDensity] = useState('compact');

  return (
    <div style={{ display: 'grid', gap: 16, width: 560 }}>
      <Menubar.Root
        altFocus={altFocus}
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel-1)' }}
      >
        <Menubar.Menu>
          <Menubar.Trigger>Файл</Menubar.Trigger>

          <Menubar.Content>
            <Menubar.Item icon={<Icon icon={FilePlus} size="sm" />} shortcut="mod+n">
              Новое пространство
            </Menubar.Item>

            <Menubar.Item icon={<Icon icon={FolderOpen} size="sm" />} shortcut="mod+o">
              Открыть…
            </Menubar.Item>

            <Menubar.Sub>
              <Menubar.SubTrigger>Недавние</Menubar.SubTrigger>

              <Menubar.SubContent>
                <Menubar.Item>Haunt Dev</Menubar.Item>
                <Menubar.Item>Книжный клуб</Menubar.Item>
              </Menubar.SubContent>
            </Menubar.Sub>

            <Menubar.Separator />

            <Menubar.Item icon={<Icon icon={Save} size="sm" />} shortcut="mod+s" onSelect={onSave}>
              Сохранить
            </Menubar.Item>

            <Menubar.Separator />

            <Menubar.Item icon={<Icon icon={LogOut} size="sm" />} shortcut="mod+q" danger>
              Выйти
            </Menubar.Item>
          </Menubar.Content>
        </Menubar.Menu>

        <Menubar.Menu>
          <Menubar.Trigger>Правка</Menubar.Trigger>

          <Menubar.Content>
            <Menubar.Item shortcut="mod+z">Отменить</Menubar.Item>
            <Menubar.Item shortcut="mod+shift+z">Повторить</Menubar.Item>

            <Menubar.Separator />

            <Menubar.Item icon={<Icon icon={Scissors} size="sm" />} shortcut="mod+x">
              Вырезать
            </Menubar.Item>

            <Menubar.Item icon={<Icon icon={Copy} size="sm" />} shortcut="mod+c">
              Копировать
            </Menubar.Item>

            <Menubar.Item shortcut="mod+v" disabled>
              Вставить
            </Menubar.Item>
          </Menubar.Content>
        </Menubar.Menu>

        <Menubar.Menu>
          <Menubar.Trigger>Вид</Menubar.Trigger>

          <Menubar.Content>
            <Menubar.CheckboxItem checked={sidebar} onCheckedChange={setSidebar} shortcut="mod+b">
              Боковая панель
            </Menubar.CheckboxItem>

            <Menubar.CheckboxItem checked={members} onCheckedChange={setMembers}>
              Участники
            </Menubar.CheckboxItem>

            <Menubar.Separator />
            <Menubar.Label>Плотность</Menubar.Label>

            <Menubar.RadioGroup value={density} onValueChange={setDensity}>
              <Menubar.RadioItem value="compact">Плотно</Menubar.RadioItem>
              <Menubar.RadioItem value="comfortable">Просторно</Menubar.RadioItem>
            </Menubar.RadioGroup>

            <Menubar.Separator />

            <Menubar.Item shortcut="f11">Во весь экран</Menubar.Item>
          </Menubar.Content>
        </Menubar.Menu>

        <Menubar.Menu>
          <Menubar.Trigger>Окно</Menubar.Trigger>

          <Menubar.Content>
            <Menubar.Item shortcut="mod+m">Свернуть</Menubar.Item>
            <Menubar.Item>Развернуть</Menubar.Item>
          </Menubar.Content>
        </Menubar.Menu>

        <Menubar.Menu>
          <Menubar.Trigger>Справка</Menubar.Trigger>

          <Menubar.Content>
            <Menubar.Item shortcut="shift+?">Сочетания клавиш</Menubar.Item>
            <Menubar.Item>О Haunt</Menubar.Item>
          </Menubar.Content>
        </Menubar.Menu>
      </Menubar.Root>

      <Input placeholder="Сообщение в #general" aria-label="Композер" />
    </div>
  );
}

const meta = {
  title: 'Всплывающее/Menubar',
  component: WindowMenu,
  subcomponents: {
    'Menubar.Root': Menubar.Root,
    'Menubar.Item': Menubar.Item,
    'Menubar.CheckboxItem': Menubar.CheckboxItem,
    'Menubar.RadioItem': Menubar.RadioItem,
  },
  tags: ['autodocs'],
  args: { onSave: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Меню окна для десктопной оболочки (Tauri) на Radix Menubar: полоса 28 px, триггеры 24 px. Пункты, флажки, радио, подменю и разделители — те же стили, что у `DropdownMenu` (`menu/menu.module.css`, концентричные радиусы). Сочетание пункта — запись `lib/hotkey` (`shortcut="mod+s"`), подпись через `formatHotkey`: «Ctrl+S» или «⌘S»; это только подпись — клавиши слушает экран (`useHotkey`). Стрелки ←/→ ходят между меню и при открытом меню открывают соседнее (Radix). Alt (нажать и отпустить) и F10 — вход в полосу и обратно на прежнее место, как в системном меню; Alt+буква и Alt+клик не считаются (`altFocus={false}` выключает).',
      },
    },
  },
} satisfies Meta<typeof WindowMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const docsFrame = { docs: { story: { inline: false, height: '320px' } } };

export const Default: Story = {};

const trigger = (canvas: HTMLElement, name: string) =>
  within(canvas).getByRole('menuitem', { name });
const openMenu = () => screen().queryByRole('menu');

export const OpensAndSelects: Story = {
  name: 'Открыть, выбрать пункт, фокус на триггер',
  parameters: docsFrame,
  play: async ({ args, canvasElement }) => {
    await userEvent.click(trigger(canvasElement, 'Файл'));

    const menu = await screen().findByRole('menu');

    await expectVisible(menu);
    // Подпись сочетания — через formatHotkey (на этой платформе Ctrl или ⌘)
    await expect(within(menu).getByText(/^(Ctrl\+S|⌘S)$/)).toBeInTheDocument();

    await userEvent.click(within(menu).getByRole('menuitem', { name: /Сохранить/ }));
    await expectGone(openMenu);
    await expect(args.onSave).toHaveBeenCalledOnce();
    await expectFocused(trigger(canvasElement, 'Файл'));
  },
};

export const ArrowsBetweenMenus: Story = {
  name: 'Стрелки между меню, Esc закрывает',
  parameters: docsFrame,
  play: async ({ canvasElement }) => {
    trigger(canvasElement, 'Файл').focus();
    await userEvent.keyboard('{ArrowRight}');
    await expectFocused(trigger(canvasElement, 'Правка'));

    await userEvent.keyboard('{ArrowDown}');
    await expectVisible(await screen().findByRole('menu'));
    await waitFor(() =>
      expect(trigger(canvasElement, 'Правка')).toHaveAttribute('data-state', 'open'),
    );

    // При открытом меню → открывает соседнее
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(trigger(canvasElement, 'Вид')).toHaveAttribute('data-state', 'open'),
    );
    await expect(
      await screen().findByRole('menuitemcheckbox', { name: /Боковая панель/ }),
    ).toBeInTheDocument();

    await pressEscape();
    await expectGone(openMenu);
    await expectFocused(trigger(canvasElement, 'Вид'));
  },
};

export const CheckboxAndRadio: Story = {
  name: 'Флажки и радио',
  parameters: docsFrame,
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement, 'Вид'));

    const menu = await screen().findByRole('menu');
    const members = within(menu).getByRole('menuitemcheckbox', { name: /Участники/ });

    await expect(members).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(members);
    await expectGone(openMenu);

    await userEvent.click(trigger(canvasElement, 'Вид'));

    const reopened = await screen().findByRole('menu');

    await expect(
      within(reopened).getByRole('menuitemcheckbox', { name: /Участники/ }),
    ).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(within(reopened).getByRole('menuitemradio', { name: 'Просторно' }));
    await userEvent.click(trigger(canvasElement, 'Вид'));
    await expect(
      within(await screen().findByRole('menu')).getByRole('menuitemradio', { name: 'Просторно' }),
    ).toHaveAttribute('aria-checked', 'true');

    await clickOutside();
    await expectGone(openMenu);
  },
};

export const AltFocus: Story = {
  name: 'Alt и F10 — в полосу и обратно',
  play: async ({ canvasElement }) => {
    const composer = within(canvasElement).getByRole('textbox', { name: 'Композер' });

    composer.focus();
    await userEvent.keyboard('{Alt}');
    await expectFocused(trigger(canvasElement, 'Файл'));

    await userEvent.keyboard('{Alt}');
    await expectFocused(composer);

    // Alt+буква — сочетание, а не вход в меню
    await userEvent.keyboard('{Alt>}f{/Alt}');
    await expectFocused(composer);

    await userEvent.keyboard('{F10}');
    await expectFocused(trigger(canvasElement, 'Файл'));
    await userEvent.keyboard('{F10}');
    await expectFocused(composer);
  },
};

export const AltFocusOff: Story = {
  name: 'altFocus={false}',
  args: { altFocus: false },
  play: async ({ canvasElement }) => {
    const composer = within(canvasElement).getByRole('textbox', { name: 'Композер' });

    composer.focus();
    await userEvent.keyboard('{Alt}');
    await expectFocused(composer);
  },
};
