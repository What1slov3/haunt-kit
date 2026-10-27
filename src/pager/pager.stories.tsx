import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Pager } from '@haunt/ui';

const lines = Array.from({ length: 42 }, (_, index) => {
  const n = String(index + 1).padStart(2, '0');

  return `${n}  правило ${index + 1}: ${index % 3 ? 'ссылки новичков — на модерацию' : 'без спама и рекламы'}`;
});

const meta = {
  title: 'TUI/Pager',
  component: Pager,
  tags: ['autodocs'],
  args: { lines, pageSize: 10, label: 'Правила пространства', onCollapse: fn() },
  argTypes: { lines: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Постраничный вывод, как `more`: первая страница и строка `-- ещё (42%) --` внизу (процент — целым вниз, 100 только в конце). Область в фокусе: Пробел — страница, Enter / ↓ — строка, `b` — назад, `G` — всё, `q` / Esc — свернуть до первой. Строка «ещё» — кнопка для мыши. С `height` новая страница прокручивается в начало, без — вывод растёт вниз. Моно и при `data-tui="off"` (содержимое), знаки `--` гаснут.',
      },
    },
  },
} satisfies Meta<typeof Pager>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const view = canvas.getByRole('region', { name: 'Правила пространства' });

    await expect(view.children).toHaveLength(10);
    await expect(canvas.getByRole('button', { name: /^ещё \(23%\)$/ })).toBeVisible();

    view.focus();
    await userEvent.keyboard(' ');
    await expect(view.children).toHaveLength(20);

    await userEvent.keyboard('{Enter}');
    await expect(view.children).toHaveLength(21);

    await userEvent.keyboard('G');
    await expect(view.children).toHaveLength(42);
    await expect(canvas.getByText('конец')).toBeVisible();

    await userEvent.keyboard('q');
    await expect(view.children).toHaveLength(10);
    await expect(args.onCollapse).toHaveBeenCalled();
  },
};

export const MouseMore: Story = {
  name: 'Кнопка «ещё»',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /ещё/ }));
    await expect(canvas.getByRole('region').children).toHaveLength(20);
  },
};

export const FixedHeight: Story = {
  name: 'Фиксированная высота',
  args: { height: 200 },
};

export const Short: Story = {
  name: 'Влезает на страницу',
  args: { lines: lines.slice(0, 4) },
};

export const TuiOff: Story = {
  name: 'Без TUI',
  globals: { tui: 'off' },
};
