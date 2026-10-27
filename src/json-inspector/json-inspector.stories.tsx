import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { JsonInspector } from '@haunt/ui';

const payload = {
  id: 'evt_01J9Z7',
  type: 'message.create',
  ok: true,
  retries: 0,
  deletedAt: null,
  author: { id: 42, name: 'haunt-bot', bot: true, roles: ['admin', 'bot'] },
  'rate limit': { perMinute: 30, burst: 5 },
  embeds: [{ title: 'Рейд в пятницу', fields: [{ name: 'Когда', value: '20:00' }] }],
  history: Array.from({ length: 240 }, (_, index) => ({ seq: index, delta: (index * 7) % 13 })),
};

const meta = {
  title: 'Данные/JsonInspector',
  component: JsonInspector,
  tags: ['autodocs'],
  args: { value: payload, search: true, maxHeight: 360 },
  argTypes: { value: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Раскрывающееся дерево значения в TUI-виде — консоль бота, отладка событий. Типы — цветами подсветки кода (`--code-*`, общие с CodeBlock): ключи, строки, числа, true / false / null. Клавиатура — как у Tree (та же модель), Enter / Пробел — раскрыть, Ctrl+C — копировать значение, Ctrl+Shift+C — путь `$.author.roles[0]`; кнопки копирования — по наведению. Массивы длиннее 100 — кусками `[0…99]`. Поиск по ключам раскрывает ветки до совпадений.',
      },
    },
  },
} satisfies Meta<typeof JsonInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('treeitem', { name: /^author/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getByText('"haunt-bot"')).toBeInTheDocument();
  },
};

export const Search: Story = {
  name: 'Поиск по ключам',
  args: { defaultExpandDepth: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByRole('textbox', { name: 'Поиск по ключам' }), 'minute');
    await waitFor(() => expect(canvas.getByText('1 совпадение')).toBeInTheDocument());
    await expect(canvasElement.querySelector('mark')?.textContent).toBe('Minute');
  },
};

export const Keyboard: Story = {
  name: 'Клавиатура',
  args: { defaultExpandDepth: 0, search: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tree = canvas.getByRole('tree');
    const author = canvas.getByRole('treeitem', { name: /^author/ });

    tree.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    await expect(author).toHaveAttribute('data-active');
    await userEvent.keyboard('{ArrowRight}');
    await expect(author).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('treeitem', { name: /^id/, selected: true })).toHaveAttribute(
      'aria-level',
      '2',
    );
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await expect(author).toHaveAttribute('aria-expanded', 'false');
  },
};

export const BigArray: Story = {
  name: 'Большой массив кусками',
  args: { value: payload.history },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('[200…239]')).toBeInTheDocument();
  },
};

export const Primitive: Story = {
  name: 'Примитив',
  args: { value: 'просто строка', search: false },
};
