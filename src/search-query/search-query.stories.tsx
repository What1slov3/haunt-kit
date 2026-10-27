import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Avatar, SearchQuery, Text, type SearchKey } from '@haunt/ui';

import { screen } from '../lib/stories/play-helpers';

const members = [
  { value: 'anna', label: 'Анна Волкова' },
  { value: 'boris', label: 'Борис Ким' },
  { value: 'vera', label: 'Вера Ли' },
];

const isoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const keys: SearchKey[] = [
  {
    key: 'from',
    label: 'от участника',
    valuePrefix: '@',
    // Участники «с сервера»: задержка и отмена
    values: (query, signal) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () =>
            resolve(
              members
                .filter(
                  (member) =>
                    member.value.startsWith(query) ||
                    member.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
                )
                .map((member) => ({
                  value: member.value,
                  label: `@${member.value}`,
                  description: member.label,
                  icon: <Avatar name={member.label} size="xs" />,
                })),
            ),
          120,
        );

        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(signal.reason);
        });
      }),
  },
  {
    key: 'in',
    label: 'в канале',
    valuePrefix: '#',
    values: ['general', 'random', 'design', 'releases'].map((value) => ({
      value,
      label: `#${value}`,
    })),
  },
  {
    key: 'has',
    label: 'есть вложение',
    values: [
      { value: 'file', description: 'файл' },
      { value: 'image', description: 'картинка' },
      { value: 'link', description: 'ссылка' },
      { value: 'video', description: 'видео' },
    ],
  },
  { key: 'before', label: 'до даты', validate: isoDate, placeholder: 'ГГГГ-ММ-ДД' },
  { key: 'after', label: 'после даты', validate: isoDate, placeholder: 'ГГГГ-ММ-ДД' },
];

function Live(props: Parameters<typeof SearchQuery>[0]) {
  const [query, setQuery] = useState(props.defaultValue ?? '');

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <SearchQuery
        {...props}
        value={query}
        onValueChange={(next) => {
          setQuery(next);
          props.onValueChange?.(next);
        }}
      />

      <Text mono size="sm" tone="muted" data-testid="query">
        {query || '—'}
      </Text>
    </div>
  );
}

const meta = {
  title: 'Поля/SearchQuery',
  component: SearchQuery,
  tags: ['autodocs'],
  render: (args) => <Live {...args} />,
  args: {
    keys,
    placeholder: 'Поиск: from:, in:, has:, before:',
    fullWidth: true,
    onValueChange: fn(),
    onSearch: fn(),
  },
  argTypes: { keys: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 520, minHeight: 320 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Поиск с фильтрами-чипами: `from:@ник in:#канал has:file before:2026-10-01` и свободный текст. Фильтр с пробелом за ним становится чипом; подсказки — ключи (по стрелке), затем значения ключа — массивом или функцией с `AbortSignal`. `validate` отсеивает негодное (дата), `placeholder` ключа подсказывает формат. Backspace в начале поля и клик по чипу возвращают фильтр в текст для правки. Значение — строка запроса: `parseSearchQuery` / `formatSearchQuery` — чистые функции, строку можно хранить в адресе.',
      },
    },
  },
} satisfies Meta<typeof SearchQuery>;

export default meta;

type Story = StoryObj<typeof meta>;

const input = (canvas: HTMLElement) => within(canvas).getByRole('combobox', { name: 'Поиск' });
const chips = (canvas: HTMLElement) =>
  within(within(canvas).getByRole('list', { name: 'Фильтры поиска' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent);

export const Default: Story = {};

export const WithFilters: Story = {
  name: 'Разобранная строка',
  args: { defaultValue: 'from:@anna in:"voice lounge" has:file релиз' },
  play: async ({ canvasElement }) => {
    await expect(chips(canvasElement)).toEqual(['from:@anna', 'in:voice lounge', 'has:file']);
    await expect(input(canvasElement)).toHaveValue('релиз');
  },
};

export const Small: Story = {
  args: { size: 'sm', defaultValue: 'in:#design кнопки' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'has:link' },
};

export const TypeFilters: Story = {
  name: 'Набор: фильтр становится чипом',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(input(canvasElement));
    await userEvent.keyboard('has:file before:2026-10-01 кот ');

    await expect(chips(canvasElement)).toEqual(['has:file', 'before:2026-10-01']);
    await expect(input(canvasElement)).toHaveValue('кот ');

    await userEvent.keyboard('{Enter}');

    await expect(args.onSearch).toHaveBeenCalledWith(
      'has:file before:2026-10-01 кот',
      expect.objectContaining({ text: 'кот' }),
    );
  },
};

export const InvalidValueStaysText: Story = {
  name: 'Негодное значение — текст',
  play: async ({ canvasElement }) => {
    await userEvent.click(input(canvasElement));
    await userEvent.keyboard('before:вчера ');

    await expect(chips(canvasElement)).toEqual([]);
    await expect(input(canvasElement)).toHaveValue('before:вчера ');
  },
};

export const KeyThenValue: Story = {
  name: 'Подсказки: ключ, затем значение',
  play: async ({ canvasElement }) => {
    const field = input(canvasElement);

    await userEvent.click(field);
    await userEvent.keyboard('fr');

    const keyList = await screen().findByRole('listbox', { name: 'Фильтры' });

    await expect(within(keyList).getAllByRole('option')).toHaveLength(1);
    // Ключ выбирается стрелкой: Enter без неё искал бы «fr»
    await expect(field).not.toHaveAttribute('aria-activedescendant');

    await userEvent.keyboard('{ArrowDown}{Enter}');

    await expect(field).toHaveValue('from:');

    const valueList = await screen().findByRole('listbox', { name: 'Значения from' });

    await waitFor(() => expect(within(valueList).getAllByRole('option')).toHaveLength(3));
    await userEvent.keyboard('б');
    await waitFor(() => expect(within(valueList).getAllByRole('option')).toHaveLength(1));
    await userEvent.keyboard('{Enter}');

    await expect(chips(canvasElement)).toEqual(['from:@boris']);
    await expect(field).toHaveValue('');
    await expect(field).toHaveFocus();
  },
};

export const FormatHint: Story = {
  name: 'Подсказка формата',
  play: async ({ canvasElement }) => {
    await userEvent.click(input(canvasElement));
    await userEvent.keyboard('after:');

    // Предлагать нечего — вместо пунктов формат значения
    await waitFor(() =>
      expect(document.querySelector('[data-suggestions]')).toHaveTextContent('ГГГГ-ММ-ДД'),
    );

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen().queryByRole('listbox')).toBeNull());
  },
};

export const BackspaceEditsChip: Story = {
  name: 'Backspace и клик возвращают чип в текст',
  args: { defaultValue: 'in:#general has:link' },
  play: async ({ canvasElement }) => {
    const field = input(canvasElement);

    await userEvent.click(field);
    await userEvent.keyboard('{Backspace}');

    await expect(chips(canvasElement)).toEqual(['in:#general']);
    await expect(field).toHaveValue('has:link');

    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Снять «in:#general»' }),
    );

    await expect(chips(canvasElement)).toEqual([]);
    await expect(within(canvasElement).getByTestId('query')).toHaveTextContent('has:link');
  },
};

export const Clear: Story = {
  name: 'Очистить',
  args: { defaultValue: 'from:@anna кот' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Очистить поиск' }));

    await expect(chips(canvasElement)).toEqual([]);
    await expect(input(canvasElement)).toHaveValue('');
    await expect(input(canvasElement)).toHaveFocus();
  },
};
