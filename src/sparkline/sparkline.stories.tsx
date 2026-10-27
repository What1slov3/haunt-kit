import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Inline, Sparkline, Stack, Text } from '@haunt/ui';

const week = [12, 18, 15, 22, 19, 28, 34];

const meta = {
  title: 'Данные/Sparkline',
  component: Sparkline,
  tags: ['autodocs'],
  args: { data: week, width: 96, height: 28, tone: 'accent', fill: false, showLast: true },
  argTypes: {
    data: { control: 'object' },
    tone: {
      control: 'inline-radio',
      options: ['accent', 'success', 'warning', 'danger', 'neutral'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Линия тренда на SVG без осей: для `Stat` и строк таблиц. Масштаб — чистой функцией (`scalePoints`): минимум внизу, максимум вверху, ровный ряд и одно значение — горизонталь посередине. `fill` — заливка градиентом цвета линии, `showLast` — точка последнего значения с ореолом (не обводкой цвета фона). `domain` — общая шкала для нескольких линий рядом. null и NaN в `data` — пропуск: линия и заливка прерываются, одиночная точка между пропусками остаётся точкой. `variant="bar"` — столбики от нуля (пропуск — без столбика, ноль — черта). `tooltip` — при наведении вертикальная черта, точка и значение моно над линией (`formatValue`); над пропуском — ближайшее значение. Без `label` линия декоративна (`aria-hidden`).',
      },
    },
  },
} satisfies Meta<typeof Sparkline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: { fill: true, width: 160, height: 40 },
};

export const Tones: Story = {
  render: (args) => (
    <Stack gap={2}>
      {(['accent', 'success', 'warning', 'danger', 'neutral'] as const).map((tone) => (
        <Inline key={tone} gap={3}>
          <Text size="sm" mono tone="subtle" style={{ width: 64 }}>
            {tone}
          </Text>

          <Sparkline {...args} tone={tone} fill />
        </Inline>
      ))}
    </Stack>
  ),
};

export const Flat: Story = {
  name: 'Ровный ряд',
  args: { data: [5, 5, 5, 5, 5], tone: 'neutral' },
};

export const SharedScale: Story = {
  name: 'Общая шкала',
  render: (args) => (
    <Inline gap={4}>
      <Sparkline {...args} data={[2, 4, 3, 6]} domain={{ min: 0, max: 40 }} />
      <Sparkline {...args} data={[10, 22, 30, 38]} domain={{ min: 0, max: 40 }} />
    </Inline>
  ),
};

export const Labelled: Story = {
  name: 'С подписью для скринридера',
  args: { label: 'Сообщения за неделю: рост' },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('img', { name: 'Сообщения за неделю: рост' }),
    ).toBeInTheDocument();
  },
};

/** Сервер не отдал два дня: линия и заливка прерываются там, где не было данных */
const withGaps = [12, 18, null, null, 22, 19, Number.NaN, 34, 30];

export const Gaps: Story = {
  name: 'Разрывы на null и NaN',
  args: { data: withGaps, width: 160, height: 40, fill: true },
  play: async ({ canvasElement }) => {
    const line = canvasElement.querySelector('path:not([fill])')!;

    // Три куска — три «M»: [12, 18], [22, 19], [34, 30]
    await expect(line.getAttribute('d')?.match(/M/g)).toHaveLength(3);
  },
};

export const Bars: Story = {
  name: 'Столбики',
  args: { variant: 'bar', data: [4, 7, 0, null, 9, 12, 6], width: 120, height: 32 },
  play: async ({ canvasElement }) => {
    // Пропуск — без столбика, ноль — черта
    await expect(canvasElement.querySelectorAll('rect')).toHaveLength(6);
  },
};

const hover = (svg: Element, fraction: number) => {
  const rect = svg.getBoundingClientRect();

  svg.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      clientX: rect.left + rect.width * fraction,
      clientY: rect.top + rect.height / 2,
    }),
  );
};

export const Tooltip: Story = {
  name: 'Подсказка значения при наведении',
  args: {
    data: withGaps,
    width: 200,
    height: 40,
    tooltip: true,
    formatValue: (value: number) => `${value} сообщ.`,
  },
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg')!;
    const hint = () => within(canvasElement).queryByTestId('sparkline-hint');

    hover(svg, 0);
    await waitFor(() => expect(hint()).toHaveTextContent('12 сообщ.'));

    // Над пропуском подсказка берёт ближайшее значение, а не «пусто»
    hover(svg, 2 / 8);
    await waitFor(() => expect(hint()).toHaveTextContent('18 сообщ.'));

    hover(svg, 1);
    await waitFor(() => expect(hint()).toHaveTextContent('30 сообщ.'));

    // React собирает onPointerLeave из pointerout с relatedTarget снаружи — так его и шлём
    svg.dispatchEvent(
      new PointerEvent('pointerout', {
        bubbles: true,
        relatedTarget: canvasElement.ownerDocument.body,
      }),
    );
    await waitFor(() => expect(hint()).toBeNull());
  },
};

export const BarsTooltip: Story = {
  name: 'Столбики с подсказкой',
  args: { variant: 'bar', data: [4, 7, 2, 9, 12, 6], width: 120, height: 32, tooltip: true },
  play: async ({ canvasElement }) => {
    hover(canvasElement.querySelector('svg')!, 4.5 / 6);
    await waitFor(() =>
      expect(within(canvasElement).queryByTestId('sparkline-hint')).toHaveTextContent('12'),
    );
  },
};
