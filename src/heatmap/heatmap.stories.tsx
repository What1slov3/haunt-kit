import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { AccentScope, Heatmap, UiStringsProvider } from '@haunt/ui';

import { chartFrame } from '../lib/stories/data-frame';

const END = '2026-10-26';

/** Год активности: будни плотнее выходных, летом затишье, случайные пустые дни */
function activity(end: string, days = 371): Record<string, number> {
  const out: Record<string, number> = {};
  const last = Date.parse(`${end}T00:00:00Z`);
  let seed = 17;

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(last - offset * 86_400_000);
    const iso = date.toISOString().slice(0, 10);
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    const summer = date.getUTCMonth() >= 5 && date.getUTCMonth() <= 7;

    seed = (seed * 1103515245 + 12345) % 2 ** 31;

    const noise = seed / 2 ** 31;

    if (noise < 0.18) continue;

    out[iso] = Math.round(noise * (weekend ? 14 : 40) * (summer ? 0.4 : 1));
  }

  return out;
}

const values = activity(END);

const meta = {
  title: 'Данные/Heatmap',
  component: Heatmap,
  tags: ['autodocs'],
  args: { values, end: END, onCellClick: fn() },
  argTypes: { values: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ ...chartFrame, maxWidth: 820 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Календарь активности, как вклад на GitHub: столбцы — недели, строки — дни недели в порядке локали (`useUiLocale`: ru — с понедельника, en-US — с воскресенья). Шкала — один оттенок акцента пространства, пять ступеней с монотонной светлотой в обеих темах (проверено расчётом). Подсказка «12 сообщений, 3 октября» — по наведению и с клавиатуры: Tab на сетку, стрелки — дни и недели, Home / End — края, Enter — `onCellClick`. Раскладка — чистая функция `heatmapLayout`.',
      },
    },
  },
} satisfies Meta<typeof Heatmap>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const grid = within(canvasElement).getByRole('grid', { name: 'Активность' });

    await expect(grid.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(360);
  },
};

export const Keyboard: Story = {
  name: 'Клавиатура и подсказка',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const last = canvasElement.querySelector<HTMLElement>(`[data-date="${END}"]`)!;

    last.focus();
    await waitFor(() => expect(canvas.getByText(/26 октября 2026/)).toBeInTheDocument());
    await userEvent.keyboard('{ArrowLeft}');
    await expect(canvasElement.querySelector('[data-date="2026-10-19"]')).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(canvasElement.querySelector('[data-date="2026-10-18"]')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onCellClick).toHaveBeenCalledWith('2026-10-18');
  },
};

export const Quarter: Story = {
  name: 'Квартал',
  args: { start: '2026-08-01' },
};

export const Teal: Story = {
  name: 'Акцент пространства',
  render: (args) => (
    <AccentScope accent="lime">
      <Heatmap {...args} />
    </AccentScope>
  ),
};

export const Empty: Story = {
  name: 'Пусто',
  args: { values: {}, start: '2026-07-01' },
};

export const SundayFirst: Story = {
  name: 'Локаль en-US — неделя с воскресенья',
  render: (args) => (
    <UiStringsProvider locale="en-US">
      <Heatmap {...args} />
    </UiStringsProvider>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('grid', { name: 'Activity' })).toBeInTheDocument();
  },
};
