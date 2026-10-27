import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Chart, Stack, Text, UiStringsProvider } from '@haunt/ui';

import { chartFrame } from '../lib/stories/data-frame';

/** Детерминированный шум: истории и снимки не меняются от прогона к прогону */
function series(seed: number, length: number, base: number, swing: number): number[] {
  let state = seed;

  return Array.from({ length }, (_, index) => {
    state = (state * 1103515245 + 12345) % 2 ** 31;

    return Math.round(base + Math.sin(index / 3 + seed) * swing + (state / 2 ** 31) * swing * 0.6);
  });
}

const days = Array.from({ length: 14 }, (_, index) => new Date(2026, 9, 13 + index));
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const meta = {
  title: 'Данные/Chart',
  component: Chart,
  tags: ['autodocs'],
  args: {
    type: 'line',
    label: 'Сообщения за две недели',
    categories: days,
    series: [
      { id: 'messages', label: 'Сообщения', data: series(3, 14, 420, 120) },
      { id: 'replies', label: 'Ответы', data: series(7, 14, 260, 80) },
      { id: 'voice', label: 'Голос, мин', data: series(11, 14, 140, 60) },
    ],
  },
  argTypes: {
    categories: { control: false },
    series: { control: false },
    type: { control: 'inline-radio', options: ['line', 'area', 'bar', 'donut'] },
  },
  decorators: [
    (Story) => (
      <div style={chartFrame}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Лёгкие SVG-графики без зависимостей по правилам dataviz: `line`, `area`, `bar` (рядом и `stacked`), `donut`. Деления осей — «красивые» (1 / 2 / 2.5 / 5 × 10ⁿ), время по X — через Intl, ширина — по контейнеру (ResizeObserver). Столбец не толще 24 px, скруглён только конец со значением, между соседями — 2 px поверхности; линия 2 px, сетка в волос. Палитра — шесть цветов из пресетов акцента, порядок проверен валидатором на дальтонизм; единственный ряд — акцент пространства. Легенда — от двух рядов, подписи — цветом текста. Подсказка — по наведению и с клавиатуры: Tab на график, стрелки, значение озвучивается; рядом — скрытая таблица с теми же данными. Появление — только при эффектах и без reduced-motion.',
      },
    },
  },
} satisfies Meta<typeof Chart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Line: Story = {
  name: 'Линии',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(canvasElement.querySelector('svg path')).not.toBeNull());
    await expect(canvas.getByRole('table', { hidden: true })).toBeInTheDocument();
  },
};

export const SingleArea: Story = {
  name: 'Область, один ряд',
  args: {
    type: 'area',
    label: 'Участники онлайн',
    series: [{ id: 'online', label: 'Онлайн', data: series(5, 14, 80, 30) }],
  },
};

export const StackedArea: Story = {
  name: 'Области стопкой',
  args: { type: 'area', stacked: true },
};

export const Gaps: Story = {
  name: 'Пропуски в данных',
  args: {
    series: [
      {
        id: 'messages',
        label: 'Сообщения',
        data: [120, 140, null, null, 180, 160, 150, null, 190, 210, 205, 230, null, 240],
      },
    ],
  },
};

export const Bars: Story = {
  name: 'Столбцы рядом',
  args: {
    type: 'bar',
    label: 'Сообщения по дням недели',
    categories: weekdays,
    series: [
      { id: 'text', label: 'Текст', data: [320, 410, 380, 450, 520, 610, 280] },
      { id: 'voice', label: 'Голос', data: [120, 90, 140, 160, 210, 340, 220] },
    ],
  },
};

export const StackedBars: Story = {
  name: 'Столбцы стопкой',
  args: {
    type: 'bar',
    stacked: true,
    label: 'Сообщения по каналам',
    categories: weekdays,
    series: [
      { id: 'general', label: '#general', data: [220, 260, 240, 280, 300, 410, 190] },
      { id: 'games', label: '#games', data: [80, 120, 90, 110, 160, 220, 140] },
      { id: 'memes', label: '#memes', data: [40, 60, 50, 70, 90, 120, 80] },
      { id: 'help', label: '#help', data: [30, 20, 40, 35, 25, 15, 10] },
    ],
  },
};

export const SingleBars: Story = {
  name: 'Один ряд с подписями',
  args: {
    type: 'bar',
    label: 'Новые участники',
    categories: weekdays,
    series: [{ id: 'joined', label: 'Новые', data: [12, 18, 9, 22, 31, 44, 17] }],
  },
};

export const Negative: Story = {
  name: 'Отрицательные значения',
  args: {
    type: 'bar',
    label: 'Прирост участников',
    categories: weekdays,
    series: [{ id: 'delta', label: 'Прирост', data: [12, -4, 9, -11, 6, 18, -2] }],
  },
};

export const Donut: Story = {
  name: 'Кольцо',
  args: {
    type: 'donut',
    label: 'Сообщения по каналам',
    categories: ['#general', '#games', '#memes', '#help', '#art', '#music', '#news', '#offtop'],
    series: [{ id: 'share', label: 'Сообщения', data: [1240, 860, 540, 320, 210, 140, 90, 60] }],
  },
  play: async ({ canvasElement }) => {
    // Восемь категорий — шестой сегмент «Прочее»: седьмой оттенок под дальтонизмом не отличить
    await waitFor(() =>
      expect(within(canvasElement).getAllByText('Прочее').length).toBeGreaterThan(0),
    );
  },
};

export const Empty: Story = {
  name: 'Нет данных',
  args: {
    series: [{ id: 'none', label: 'Сообщения', data: [null, null, null] }],
    categories: ['a', 'b', 'c'],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Нет данных')).toBeInTheDocument();
  },
};

export const Keyboard: Story = {
  name: 'Клавиатура: стрелки по точкам',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const plot = canvas.getByRole('group', { name: 'Сообщения за две недели' });

    await waitFor(() => expect(canvasElement.querySelector('svg')).not.toBeNull());
    plot.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(canvasElement.querySelector('[aria-live="polite"]')?.textContent).toMatch(/Сообщения/),
    );
    await userEvent.keyboard('{End}');
    await waitFor(() =>
      expect(canvasElement.querySelector('[aria-live="polite"]')?.textContent).toMatch(/26/),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(canvasElement.querySelector('[aria-live="polite"]')?.textContent).toBe(''),
    );
  },
};

export const Hover: Story = {
  name: 'Подсказка по наведению',
  args: { type: 'bar', categories: weekdays, series: Bars.args!.series! },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('svg path')).not.toBeNull());

    const svg = canvasElement.querySelector('svg')!;
    const rect = svg.getBoundingClientRect();

    await userEvent.pointer({
      target: svg,
      coords: { clientX: rect.left + rect.width * 0.6, clientY: rect.top + 60 },
    });
    await waitFor(() =>
      expect(within(canvasElement).getAllByText('Голос').length).toBeGreaterThan(1),
    );
  },
};

export const Narrow: Story = {
  name: 'Узкая колонка',
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};

export const English: Story = {
  name: 'Локаль en',
  render: (args) => (
    <UiStringsProvider locale="en">
      <Stack gap={2}>
        <Text tone="subtle">Axis dates and number grouping follow the locale</Text>
        <Chart {...args} label="Messages" />
      </Stack>
    </UiStringsProvider>
  ),
};
