import { useRef, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  Avatar,
  Button,
  FLIP_KEY_ATTRIBUTE,
  Inline,
  Stack,
  Text,
  useFlipList,
  type FlipListOptions,
} from '@haunt/ui';

const people = ['Мира', 'Тени', 'Лис', 'Вега', 'Орлан', 'Сойка'];

/** Демо хука: список участников, которых можно перемешать, добавить и поднять наверх */
function FlipListDemo(props: FlipListOptions) {
  const listRef = useRef<HTMLUListElement>(null);
  const [items, setItems] = useState(people.slice(0, 4));

  useFlipList(listRef, props);

  return (
    <Stack gap={3} style={{ width: 300 }}>
      <Inline gap={2}>
        <Button size="sm" onClick={() => setItems((current) => [...current].reverse())}>
          Перевернуть
        </Button>

        <Button
          size="sm"
          variant="secondary"
          disabled={items.length === people.length}
          onClick={() => setItems((current) => [people[current.length]!, ...current])}
        >
          Добавить
        </Button>
      </Inline>

      <ul
        ref={listRef}
        style={{ display: 'grid', gap: 4, margin: 0, padding: 0, listStyle: 'none' }}
      >
        {items.map((name) => (
          <li
            key={name}
            {...{ [FLIP_KEY_ATTRIBUTE]: name }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 'var(--row-md, 32px)',
              padding: '0 8px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)',
            }}
          >
            <Avatar name={name} size="xs" />
            <Text>{name}</Text>
          </li>
        ))}
      </ul>
    </Stack>
  );
}

const meta = {
  title: 'Движение/useFlipList',
  component: FlipListDemo,
  tags: ['autodocs'],
  args: { enter: true },
  parameters: {
    docs: {
      description: {
        component:
          '`useFlipList(ref, options)` — FLIP для перестановки и добавления элементов списка, обобщение FLIP-индикатора (`use-shared-indicator`). Элементам — атрибут `data-flip-key={id}` (`FLIP_KEY_ATTRIBUTE`). После коммита хук сравнивает позиции с прошлыми и проигрывает обратный путь через WAAPI, по умолчанию — пружиной `snappy` (`spring()` + `linear()`). Прерванный переезд продолжается с видимого места. Удаление — `Presence` вокруг элемента. reduced-motion — без анимации.',
      },
    },
  },
} satisfies Meta<typeof FlipListDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

const rows = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>(`[${FLIP_KEY_ATTRIBUTE}]`),
];

export const Reorder: Story = {
  name: 'Перестановка',
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Перевернуть' }));

    const [first] = rows(canvasElement);

    await expect(first).toHaveAttribute(FLIP_KEY_ATTRIBUTE, 'Вега');
    // Строки едут из старых мест: у них идёт анимация transform
    await expect(first!.getAnimations().length).toBeGreaterThan(0);
    await waitFor(() => expect(first!.getAnimations()).toHaveLength(0), { timeout: 2000 });
  },
};

export const Add: Story = {
  name: 'Добавление',
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Добавить' }));

    const [added, shifted] = rows(canvasElement);

    await expect(added).toHaveAttribute(FLIP_KEY_ATTRIBUTE, 'Орлан');
    await expect(added!.getAnimations().length).toBeGreaterThan(0);
    await expect(shifted!.getAnimations().length).toBeGreaterThan(0);
  },
};

export const NoEnter: Story = { name: 'Без появления новых', args: { enter: false } };
