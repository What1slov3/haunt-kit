import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hash, Settings } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Breadcrumbs, Icon, type BreadcrumbItem } from '@haunt/ui';

import {
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

const settingsPath: BreadcrumbItem[] = [
  { label: 'Haunt', href: '#space' },
  { label: 'Настройки', href: '#settings', icon: <Icon icon={Settings} size="sm" /> },
  { label: 'Роли и права' },
];

const deepPath: BreadcrumbItem[] = [
  { label: 'Haunt', href: '#space' },
  { label: 'Настройки', href: '#settings' },
  { label: 'Каналы', href: '#channels' },
  { label: 'Дизайн', href: '#design' },
  { label: 'design-review', href: '#design-review', icon: <Icon icon={Hash} size="sm" /> },
  { label: 'Права доступа' },
];

const meta = {
  title: 'Списки/Breadcrumbs',
  component: Breadcrumbs,
  tags: ['autodocs'],
  args: { items: settingsPath, onNavigate: fn() },
  argTypes: { items: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Путь в настройках и вложенных местах: `nav` + `ol`, разделитель `/` моно, последняя крошка — текущая страница (`aria-current="page"`, не ссылка). Путь длиннее `maxItems` сворачивает середину в `…` — меню со скрытыми разделами. `onNavigate` — переход внутри приложения: обычный клик уходит в него, Ctrl/⌘-клик остаётся браузеру; свёрнутые пункты в меню — тоже настоящие `<a href>` (`DropdownMenu.Item asChild`), их можно открыть в новой вкладке. Длинные подписи обрезаются, полная — в `title`.',
      },
    },
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Collapsed: Story = {
  name: 'Длинный путь — середина свёрнута',
  args: { items: deepPath },
};

export const MoreBefore: Story = {
  name: 'itemsBefore: 2',
  args: { items: deepPath, maxItems: 5, itemsBefore: 2 },
};

export const LongLabels: Story = {
  name: 'Длинные подписи',
  args: {
    items: [
      { label: 'Очень длинное название пространства сообщества', href: '#space' },
      { label: 'Раздел настроек с длинным названием', href: '#settings' },
      { label: 'Текущая страница с названием, которое не помещается' },
    ],
  },
  render: (args) => (
    <div style={{ width: 420, resize: 'horizontal', overflow: 'hidden' }}>
      <Breadcrumbs {...args} />
    </div>
  ),
};

/** Без onNavigate крошки — обычные ссылки */
export const PlainLinks: Story = { args: { onNavigate: undefined } };

export const CurrentPage: Story = {
  name: 'Последняя крошка — текущая страница',
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getByRole('navigation', { name: 'Путь' });
    const current = within(nav).getByText('Роли и права').closest('[aria-current]');

    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(within(nav).getAllByRole('link')).toHaveLength(2);
    await expect(within(nav).getAllByRole('listitem')).toHaveLength(3);
  },
};

export const NavigatesInApp: Story = {
  name: 'onNavigate перехватывает обычный клик',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('link', { name: 'Настройки' }));

    await expect(args.onNavigate).toHaveBeenCalledWith(settingsPath[1], 1);
    await expect(window.location.hash).not.toBe('#settings');
  },
};

export const OpensHidden: Story = {
  name: 'Многоточие открывает скрытые разделы',
  args: { items: deepPath },
  play: async ({ args, canvasElement }) => {
    const more = within(canvasElement).getByRole('button', { name: 'Скрытые разделы: 3' });

    await expect(within(canvasElement).queryByText('Каналы')).toBeNull();

    await userEvent.click(more);

    const menu = await screen().findByRole('menu');

    await expectVisible(menu);
    await expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Настройки', 'Каналы', 'Дизайн']);

    await pressEscape();
    await expectGone(() => screen().queryByRole('menu'));
    await expectFocused(more);

    await userEvent.keyboard('{Enter}');
    await expectVisible(await screen().findByRole('menu'));
    // Открытое с клавиатуры меню фокусирует первый пункт
    await userEvent.keyboard('{ArrowDown}{Enter}');

    await expectGone(() => screen().queryByRole('menu'));
    await expect(args.onNavigate).toHaveBeenCalledWith(deepPath[2], 2);
  },
};

export const HiddenAreLinks: Story = {
  name: 'Свёрнутые пункты — настоящие ссылки',
  args: { items: deepPath },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Скрытые разделы: 3' }),
    );

    const menu = await screen().findByRole('menu');
    const channels = within(menu).getByRole('menuitem', { name: 'Каналы' });

    await expectVisible(menu);
    // Пункт — сам <a href>: браузер умеет открыть его в новой вкладке
    await expect(channels.tagName).toBe('A');
    await expect(channels).toHaveAttribute('href', '#channels');

    // Ctrl-клик остаётся браузеру: onNavigate не зовётся, переход не гасится
    let prevented: boolean | undefined;
    const spy = (event: MouseEvent) => {
      prevented = event.defaultPrevented;
      // Сам переход в тесте не нужен — гасим уже после проверки компонента
      event.preventDefault();
    };

    // Отдельные вызовы userEvent не делят зажатые модификаторы — клик с Ctrl шлём сами
    window.addEventListener('click', spy);
    channels.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true }),
    );
    window.removeEventListener('click', spy);

    await expect(prevented).toBe(false);
    await expect(args.onNavigate).not.toHaveBeenCalled();

    // Обычный клик уходит в onNavigate и закрывает меню
    if (!screen().queryByRole('menu')) {
      await userEvent.click(
        within(canvasElement).getByRole('button', { name: 'Скрытые разделы: 3' }),
      );
    }

    await userEvent.click(await screen().findByRole('menuitem', { name: 'Дизайн' }));
    await expectGone(() => screen().queryByRole('menu'));
    await expect(args.onNavigate).toHaveBeenCalledWith(deepPath[3], 3);
  },
};
