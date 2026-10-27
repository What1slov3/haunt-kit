import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hash, Volume2 } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Avatar, Combobox, Field, Icon, type ComboboxOption } from '@haunt/ui';

import {
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

const firstNames = [
  'Анна',
  'Борис',
  'Вера',
  'Глеб',
  'Дина',
  'Егор',
  'Жанна',
  'Зоя',
  'Илья',
  'Ксения',
];
const lastNames = [
  'Орлова',
  'Петров',
  'Соколова',
  'Тихонов',
  'Уварова',
  'Фёдоров',
  'Шилова',
  'Юдин',
];

/* Детерминированный список на 300 участников: имя × фамилия × номер, без случайности между прогонами */
const members: ComboboxOption[] = [
  {
    value: 'vagner',
    label: 'Владислав Вагнер',
    description: '@vagner · владелец',
    keywords: ['vagner'],
  },
  {
    value: 'moderator',
    label: 'Ёлка Модераторова',
    description: '@elka · модератор',
    keywords: ['elka'],
  },
  { value: 'banned', label: 'Забаненный Гость', description: 'недоступен', disabled: true },
  ...Array.from({ length: 297 }, (_, index) => {
    const name = `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;

    return {
      value: `member-${index}`,
      label: `${name} ${index + 1}`,
      description: `@user${index + 1}`,
    };
  }),
].map((member): ComboboxOption => ({
  ...member,
  icon: <Avatar name={member.label} size="xs" />,
}));

const channels: ComboboxOption[] = [
  { value: 'general', label: 'общий', icon: <Icon icon={Hash} size="sm" /> },
  { value: 'news', label: 'новости', icon: <Icon icon={Hash} size="sm" /> },
  { value: 'memes', label: 'мемы', icon: <Icon icon={Hash} size="sm" /> },
  { value: 'voice', label: 'Голосовая', icon: <Icon icon={Volume2} size="sm" /> },
];

const meta = {
  title: 'Поля/Combobox',
  component: Combobox,
  tags: ['autodocs'],
  args: {
    options: members,
    placeholder: 'Выберите участника',
    searchPlaceholder: 'Имя или @ник',
    'aria-label': 'Участник',
    onValueChange: fn(),
    onOpenChange: fn(),
  },
  argTypes: {
    options: { control: false },
    emptyText: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Выбор одного значения из большого списка с поиском: участник, роль, канал. Триггер — на рамке поля, список — в поповере со стеклом, поле поиска — `Input prompt`. Фокус остаётся в поиске, стрелки, Home / End двигают активный пункт (`aria-activedescendant`), Enter выбирает, Esc закрывает и возвращает фокус на триггер. Совпадения подсвечены цветом акцента; слова запроса ищутся в любом порядке, «ё» равна «е», `keywords` — скрытые слова для поиска. Список виртуализирован: в DOM только видимые пункты, а стрелки и End доходят до последнего совпадения; `maxResults` возвращает прежний режим — не больше N пунктов и «ещё N — уточните запрос». Внутри `<Field>` связан с меткой и ошибкой.',
      },
    },
  },
} satisfies Meta<typeof Combobox>;

export default meta;

type Story = StoryObj<typeof meta>;

const trigger = (canvas: HTMLElement) => within(canvas).getByRole('combobox', { name: 'Участник' });
const listbox = () => screen().queryByRole('listbox');
const search = () => screen().getByRole('combobox', { name: 'Имя или @ник' });

export const Default: Story = {};

export const WithValue: Story = {
  args: { defaultValue: 'vagner' },
};

export const Open: Story = {
  args: { defaultOpen: true, defaultValue: 'moderator' },
  parameters: { docs: { story: { inline: false, height: '420px' } } },
};

export const Small: Story = {
  args: { size: 'sm', options: channels, placeholder: 'Канал', 'aria-label': 'Канал' },
};

export const Invalid: Story = {
  args: { invalid: true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'vagner' },
  play: async ({ canvasElement }) => {
    await expect(trigger(canvasElement)).toBeDisabled();
  },
};

/** Внутри `<Field>`: метка фокусирует триггер, ошибка читается как описание */
export const InField: Story = {
  args: { 'aria-label': undefined },
  render: (args) => (
    <Field label="Владелец канала" error="Выберите участника">
      <Combobox {...args} fullWidth />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const combobox = within(canvasElement).getByRole('combobox', { name: 'Владелец канала' });

    await expect(combobox).toHaveAttribute('aria-invalid', 'true');
    await expect(combobox).toHaveAccessibleDescription('Выберите участника');
  },
};

export const SearchAndHighlight: Story = {
  name: 'Поиск подсвечивает совпадения',
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('listbox'));
    await expectFocused(search());

    await userEvent.keyboard('ваг');

    const options = screen().getAllByRole('option');

    await expect(options).toHaveLength(1);
    await expect(options[0]?.querySelector('mark')).toHaveTextContent('Ваг');
  },
};

export const KeyboardSelect: Story = {
  name: 'Стрелки, Home / End, Enter',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('listbox'));

    const active = () =>
      document.getElementById(search().getAttribute('aria-activedescendant') ?? '');

    await expect(active()).toHaveTextContent('Владислав Вагнер');

    // Третий пункт выключен — стрелка его перепрыгивает
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(active()).toHaveTextContent('Анна Орлова 1');

    // Список виртуальный: End доходит до последнего из 300, и этот пункт есть в DOM
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(active()).toHaveTextContent('Жанна Орлова 297'));

    await userEvent.keyboard('{Home}{ArrowDown}{Enter}');

    await expectGone(listbox);
    await expect(args.onValueChange).toHaveBeenCalledWith('moderator');
    await expect(trigger(canvasElement)).toHaveTextContent('Ёлка Модераторова');
    await expectFocused(trigger(canvasElement));
  },
};

export const TypeToOpen: Story = {
  name: 'Печать на триггере начинает поиск',
  play: async ({ canvasElement }) => {
    trigger(canvasElement).focus();

    await userEvent.keyboard('ё');
    await expectVisible(await screen().findByRole('listbox'));
    await waitFor(() => expect(search()).toHaveValue('ё'));
    await expect(screen().getAllByRole('option')[0]).toHaveTextContent('Ёлка Модераторова');
  },
};

export const Empty: Story = {
  name: 'Пустой результат',
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await userEvent.type(await screen().findByRole('combobox', { name: 'Имя или @ник' }), 'zzz');

    await expect(screen().queryAllByRole('option')).toHaveLength(0);
    await expect(within(screen().getByRole('dialog')).getByRole('status')).toHaveTextContent(
      'Ничего не нашлось',
    );
  },
};

export const ClosesOnEscape: Story = {
  name: 'Закрывается по Esc, значение не меняется',
  args: { defaultValue: 'vagner' },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('listbox'));

    await userEvent.keyboard('{ArrowDown}');
    await pressEscape();

    await expectGone(listbox);
    await expectFocused(trigger(canvasElement));
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

export const MouseSelect: Story = {
  name: 'Выбор мышью',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await userEvent.click(await screen().findByRole('option', { name: /Ёлка Модераторова/ }));

    await expectGone(listbox);
    await expect(args.onValueChange).toHaveBeenCalledWith('moderator');
  },
};

/** Управляемое значение: внешний стейт и подпись выбранного рядом */
export const Controlled: Story = {
  render: function ControlledStory(args) {
    const [value, setValue] = useState<string | null>('general');

    return (
      <Combobox
        {...args}
        options={channels}
        aria-label="Канал"
        value={value}
        onValueChange={(next) => {
          setValue(next);
          args.onValueChange?.(next);
        }}
      />
    );
  },
};

export const Virtualized: Story = {
  name: 'Виртуальный список: 300 участников, в DOM — окно',
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));

    const list = await screen().findByRole('listbox');

    await expectVisible(list);

    const options = screen().getAllByRole('option');

    await expect(options.length).toBeLessThan(40);
    await expect(options[0]).toHaveAttribute('aria-setsize', '300');

    // Активный пункт в конце списка нарисован и виден в окне
    await userEvent.keyboard('{End}');
    await waitFor(() => {
      const active = document.getElementById(search().getAttribute('aria-activedescendant') ?? '');
      const box = list.getBoundingClientRect();

      expect(active).toHaveAttribute('aria-posinset', '300');
      expect(active?.getBoundingClientRect().bottom).toBeLessThanOrEqual(box.bottom + 1);
    });
    await expect(screen().getAllByRole('option').length).toBeLessThan(40);
  },
};

export const MaxResults: Story = {
  name: 'maxResults — как раньше: не больше N и «ещё N»',
  args: { maxResults: 100 },
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('listbox'));

    await expect(screen().getAllByRole('option')).toHaveLength(100);
    await expect(screen().getByText('ещё 200 — уточните запрос')).toBeVisible();

    await userEvent.keyboard('{End}');

    const active = document.getElementById(search().getAttribute('aria-activedescendant') ?? '');

    await expect(active).toHaveTextContent('Жанна Орлова 97');
  },
};
