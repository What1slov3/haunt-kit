import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AtSign,
  Hash,
  Languages,
  LogOut,
  Moon,
  Plus,
  Settings,
  UserPlus,
  Volume2,
} from 'lucide-react';
import { expect, fn, mocked, userEvent, waitFor, within } from 'storybook/test';

import {
  Button,
  CommandPalette,
  type CommandLoader,
  formatHotkey,
  Icon,
  pushRecentCommand,
  useHotkey,
  type CommandItem,
} from '@haunt/ui';

import {
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface PaletteDemoProps {
  /** Выполнена команда — её id */
  onRun?: (id: string) => void;
  /** id недавних при первом показе */
  initialRecent?: string[];
  defaultOpen?: boolean;
  /** Добавить команду-страницу «Язык интерфейса →» */
  withPages?: boolean;
  /** Участники с «сервера» */
  loadItems?: CommandLoader;
}

/** Страница со своим подсписком: выбор открывает его, Backspace на пустом вводе — назад */
function languagePage(run: (id: string) => void): CommandItem {
  return {
    id: 'language',
    label: 'Язык интерфейса',
    group: 'Настроить',
    icon: <Icon icon={Languages} size="sm" />,
    placeholder: 'Выберите язык…',
    items: [
      { id: 'lang-ru', label: 'Русский', onSelect: () => run('lang-ru') },
      { id: 'lang-en', label: 'English', onSelect: () => run('lang-en') },
    ],
  };
}

const MEMBERS = ['Аня Морозова', 'Артём Ким', 'Борис Лебедев', 'Вера Анисимова', 'Глеб Андреев'];

/** «Сервер» участников: отвечает через 300 мс, по запросу «ошибка» падает, отмену слушает по signal */
function searchMembers(query: string, signal: AbortSignal): Promise<CommandItem[]> {
  if (!query.trim()) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      if (query.trim() === 'ошибка') {
        reject(new Error('Сервер недоступен'));

        return;
      }

      const needle = query.trim().toLowerCase();

      resolve(
        MEMBERS.filter((name) => name.toLowerCase().includes(needle)).map((name) => ({
          id: `member-${name}`,
          label: name,
          group: 'Участники',
          icon: <Icon icon={AtSign} size="sm" />,
        })),
      );
    }, 300);

    signal.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('Отменено', 'AbortError'));
    });
  });
}

function buildItems(run: (id: string) => void): CommandItem[] {
  const icon = (glyph: typeof Hash) => <Icon icon={glyph} size="sm" />;

  return [
    { id: 'general', label: 'general', group: 'Каналы', icon: icon(Hash), description: 'Haunt' },
    {
      id: 'design',
      label: 'design-review',
      group: 'Каналы',
      icon: icon(Hash),
      description: 'Haunt',
    },
    {
      id: 'voice',
      label: 'Голосовая',
      group: 'Каналы',
      icon: icon(Volume2),
      keywords: ['voice', 'звонок'],
    },
    {
      id: 'new-channel',
      label: 'Новый канал',
      group: 'Создать',
      icon: icon(Plus),
      shortcut: formatHotkey('mod+shift+n'),
    },
    {
      id: 'invite',
      label: 'Пригласить в пространство',
      group: 'Создать',
      icon: icon(UserPlus),
      description: 'ссылка на 7 дней',
    },
    {
      id: 'settings',
      label: 'Настройки',
      group: 'Настроить',
      icon: icon(Settings),
      keywords: ['preferences', 'параметры'],
      shortcut: formatHotkey('mod+,'),
    },
    {
      id: 'theme',
      label: 'Сменить тему',
      group: 'Настроить',
      icon: icon(Moon),
      keywords: ['dark', 'light'],
    },
    {
      id: 'leave',
      label: 'Выйти из пространства',
      group: 'Настроить',
      icon: icon(LogOut),
      disabled: true,
    },
  ].map((item) => ({ ...item, onSelect: () => run(item.id) }));
}

/** Экран с палитрой: кнопка и Ctrl K открывают, выбор пополняет недавние */
function PaletteDemo({
  onRun,
  initialRecent = [],
  defaultOpen = false,
  withPages = false,
  loadItems,
}: PaletteDemoProps) {
  const run = (id: string) => onRun?.(id);
  const items = buildItems(run);

  const [open, setOpen] = useState(defaultOpen);
  const [recent, setRecent] = useState(initialRecent);

  useHotkey('mod+k', () => setOpen((value) => !value), { allowInInput: true });

  return (
    <>
      <Button shortcut={formatHotkey('mod+k')} onClick={() => setOpen(true)}>
        Палитра команд
      </Button>

      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={withPages ? [...items, languagePage(run)] : items}
        loadItems={loadItems}
        recent={recent}
        onItemSelect={(item) => setRecent((ids) => pushRecentCommand(ids, item.id))}
      />
    </>
  );
}

const meta = {
  title: 'Всплывающее/CommandPalette',
  component: PaletteDemo,
  subcomponents: { CommandPalette },
  tags: ['autodocs'],
  args: { onRun: fn() },
  parameters: {
    docs: {
      description: {
        component:
          "Палитра команд (`Ctrl K` / `⌘K`): стеклянное окно у верхней трети экрана, строка запроса `Input prompt`, команды по группам с иконкой, пояснением и сочетанием. Ввод сразу фильтрует: целиком → начало подписи → начало слова → все слова по порядку → подстрока → `keywords` → описание; совпадение подсвечено акцентом. Клавиатура: ↑ ↓, Home / End, Enter, Esc. Пока запрос пуст — группа «Недавние» (`recent`, `pushRecentCommand`). Команды передаются массивом: ранжирование и подсветка работают с данными, а не с разметкой. Открытие по сочетанию — `useHotkey('mod+k', …, { allowInInput: true })` на экране. Набранное в другой раскладке тоже находится («yfcn» → «Настройки», «пут» → «general»), но ниже прямых совпадений. `loadItems(query, signal)` — команды с сервера: после паузы `loadDelay`, прежний запрос отменяется через `AbortSignal`, пока ждём — строка с `TuiSpinner`, ошибка — строкой. Команда с `items` / `loadItems` — вложенная страница: Enter открывает подсписок, в поле — крошка страницы, Backspace на пустом вводе и Esc — назад.",
      },
    },
  },
} satisfies Meta<typeof PaletteDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

const trigger = (canvas: HTMLElement) =>
  within(canvas).getByRole('button', { name: /Палитра команд/ });
const palette = () => screen().queryByRole('dialog', { name: 'Палитра команд' });
const input = () => screen().getByRole('combobox', { name: 'Палитра команд' });
const options = () => screen().queryAllByRole('option');
const activeOption = () =>
  options().find((option) => option.getAttribute('aria-selected') === 'true');

async function openPalette(canvas: HTMLElement) {
  await userEvent.click(trigger(canvas));
  await expectVisible(await screen().findByRole('dialog', { name: 'Палитра команд' }));
  await expectFocused(input());
}

export const Default: Story = {};

export const Open: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, height: '520px' } } },
};

export const WithRecent: Story = {
  name: 'С недавними',
  args: { defaultOpen: true, initialRecent: ['settings', 'design'] },
  parameters: { docs: { story: { inline: false, height: '520px' } } },
};

export const OpensWithHotkey: Story = {
  name: 'Открывается по Ctrl K, закрывается по Esc',
  play: async ({ canvasElement }) => {
    trigger(canvasElement).focus();
    await userEvent.keyboard('{Control>}k{/Control}');

    await expectVisible(await screen().findByRole('dialog', { name: 'Палитра команд' }));
    await expectFocused(input());

    await pressEscape();

    await expectGone(palette);
    await expectFocused(trigger(canvasElement));
  },
};

export const FiltersAndHighlights: Story = {
  name: 'Ввод фильтрует, совпадение подсвечено',
  play: async ({ canvasElement }) => {
    await openPalette(canvasElement);
    await userEvent.keyboard('кан');

    await waitFor(() => expect(options()).toHaveLength(1));
    await expect(options()[0]).toHaveTextContent('Новый канал');
    await expect(options()[0]!.querySelector('mark')).toHaveTextContent('кан');

    // По keywords: «voice» нет в подписи, но команда находится
    await userEvent.clear(input());
    await userEvent.keyboard('voice');

    await waitFor(() =>
      expect(options().map((option) => option.textContent)).toEqual(['Голосовая']),
    );
  },
};

export const KeyboardNavigation: Story = {
  name: 'Стрелки, Home / End и Enter',
  play: async ({ args, canvasElement }) => {
    await openPalette(canvasElement);

    await expect(activeOption()).toHaveTextContent('general');
    await expect(input()).toHaveAttribute('aria-activedescendant', activeOption()!.id);

    await userEvent.keyboard('{ArrowDown}');
    await expect(activeOption()).toHaveTextContent('design-review');

    // Выключенный «Выйти» пропускается: End — последняя доступная команда
    await userEvent.keyboard('{End}');
    await expect(activeOption()).toHaveTextContent('Сменить тему');

    await userEvent.keyboard('{ArrowDown}');
    await expect(activeOption()).toHaveTextContent('general');

    await userEvent.keyboard('{ArrowUp}{Home}{ArrowDown}{ArrowDown}{Enter}');

    await expectGone(palette);
    await expect(args.onRun).toHaveBeenCalledWith('voice');
  },
};

export const Empty: Story = {
  name: 'Ничего не найдено',
  play: async ({ canvasElement }) => {
    await openPalette(canvasElement);
    await userEvent.keyboard('квантовый');

    await expect(await screen().findByRole('status')).toHaveTextContent(
      'Ничего не найдено«квантовый»',
    );
    await expect(screen().queryByRole('listbox')).toBeNull();
  },
};

export const RemembersRecent: Story = {
  name: 'Выбранное попадает в недавние',
  play: async ({ args, canvasElement }) => {
    await openPalette(canvasElement);
    await userEvent.keyboard('тем');
    await userEvent.click(await screen().findByRole('option', { name: /Сменить тему/ }));

    await expectGone(palette);
    await expect(args.onRun).toHaveBeenCalledWith('theme');

    await openPalette(canvasElement);

    const recentGroup = screen().getByRole('group', { name: 'Недавние' });

    await expect(within(recentGroup).getByRole('option')).toHaveTextContent('Сменить тему');
    await expect(activeOption()).toHaveTextContent('Сменить тему');
  },
};

export const WrongLayout: Story = {
  name: 'Поиск в неверной раскладке',
  play: async ({ canvasElement }) => {
    await openPalette(canvasElement);

    // «yfcn» — это «наст» в русской раскладке
    await userEvent.keyboard('yfcn');
    await waitFor(() => expect(activeOption()).toHaveTextContent('Настройки'));
    await expect(activeOption()!.querySelector('mark')).toHaveTextContent('Наст');

    // И обратно: «пут» — «gen» в английской
    await userEvent.clear(input());
    await userEvent.keyboard('пут');
    await waitFor(() => expect(activeOption()).toHaveTextContent('general'));
  },
};

export const Pages: Story = {
  name: 'Вложенные страницы: Enter — внутрь, Backspace и Esc — назад',
  args: { withPages: true },
  play: async ({ args, canvasElement }) => {
    await openPalette(canvasElement);
    await userEvent.keyboard('язык');
    await waitFor(() => expect(activeOption()).toHaveTextContent('Язык интерфейса'));
    await userEvent.keyboard('{Enter}');

    // Палитра не закрылась: подсписок, запрос пуст, в поле — крошка страницы
    await waitFor(() =>
      expect(options().map((option) => option.textContent)).toEqual(['Русский', 'English']),
    );
    await expect(input()).toHaveValue('');
    await expect(input()).toHaveAttribute('placeholder', 'Выберите язык…');
    await expect(palette()).toHaveTextContent('Язык интерфейса');

    await userEvent.keyboard('{Backspace}');
    await waitFor(() => expect(activeOption()).toHaveTextContent('Язык интерфейса'));

    // Esc на странице — тоже назад, а не закрыть
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(options()).toHaveLength(2));
    await pressEscape();
    await waitFor(() => expect(activeOption()).toHaveTextContent('Язык интерфейса'));
    await expect(palette()).not.toBeNull();

    await userEvent.keyboard('{Enter}eng{Enter}');
    await expectGone(palette);
    await expect(args.onRun).toHaveBeenCalledWith('lang-en');
  },
};

export const AsyncSource: Story = {
  name: 'Асинхронный источник: загрузка, отмена, ошибка',
  args: { loadItems: fn(searchMembers) },
  play: async ({ args, canvasElement }) => {
    const loader = mocked(args.loadItems!);

    await openPalette(canvasElement);
    await userEvent.keyboard('ан');

    // Пока ждём ответа — строка загрузки со спиннером
    await expect(await screen().findByRole('status', { name: 'Загрузка…' })).toBeVisible();
    await waitFor(() => expect(loader).toHaveBeenCalledWith('ан', expect.any(AbortSignal)));

    // Ввод ушёл дальше, пока запрос в пути, — прежний отменён
    await userEvent.keyboard('и');
    await waitFor(() => expect(loader).toHaveBeenCalledWith('ани', expect.any(AbortSignal)));

    const earlier = loader.mock.calls.find(([query]) => query === 'ан')![1];

    await expect(earlier.aborted).toBe(true);
    await waitFor(() =>
      expect(options().map((option) => option.textContent)).toEqual(['Вера Анисимова']),
    );
    await expect(options()[0]!.querySelector('mark')).toHaveTextContent('Ани');
    await expect(screen().queryByRole('status', { name: 'Загрузка…' })).toBeNull();

    await userEvent.clear(input());
    await userEvent.keyboard('ошибка');
    await expect(await screen().findByRole('alert')).toHaveTextContent('Сервер недоступен');
  },
};
