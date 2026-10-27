import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Calendar, weekday } from '@haunt/ui';

import { expectFocused } from '../lib/stories/play-helpers';

const meta = {
  title: 'Поля/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  // «Сегодня» закреплено: снимки и проверки не должны зависеть от дня прогона
  args: {
    today: '2026-10-26',
    defaultMonth: '2026-10-01',
    locale: 'ru',
    weekStartsOn: 1,
    onValueChange: fn(),
  },
  argTypes: {
    weekStartsOn: { control: 'inline-radio', options: [1, 0] },
    mode: { control: 'inline-radio', options: ['single', 'range'] },
    months: { control: { type: 'number', min: 1, max: 3 } },
    isDateDisabled: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Месяц сеткой на `Intl` (локаль параметром, по умолчанию `ru`), неделя с понедельника (`weekStartsOn`). Даты — строки `YYYY-MM-DD` без часового пояса. Сегодня — кольцо тона акцента, выбранный день — заливка акцентом, `min` / `max` / `isDateDisabled` — зачёркнутые дни. Клавиатура по шаблону WAI-ARIA: одна остановка Tab, стрелки — день и неделя, PageUp / PageDown — месяц (Shift — год), Home / End — неделя, Enter / Space — выбрать. Сетка всегда в 6 недель, чтобы поповер не менял высоту. `mode="range"` — диапазон `{ start, end }`: первый выбор — начало, до второго промежуток следует за курсором или фокусом (тише выбора), концы скруглены, промежуток сплошной; занятый день (`isDateDisabled`) не перешагнуть — дни за ним тише, клик по ним начинает новый диапазон (`allowDisabledInRange` снимает запрет). `months={2}` — месяцы рядом, окно сдвигается ровно настолько, чтобы день в фокусе был виден.',
      },
    },
  },
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { defaultValue: '2026-10-14' } };

export const MinMax: Story = {
  name: 'min и max',
  args: { min: '2026-10-08', max: '2026-11-12' },
};

export const WeekendsDisabled: Story = {
  name: 'Выходные выключены',
  args: { isDateDisabled: (date) => [0, 6].includes(weekday(date)) },
};

export const English: Story = {
  name: 'en-US, неделя с воскресенья',
  args: { locale: 'en-US', weekStartsOn: 0 },
};

const grid = (canvas: HTMLElement) => within(canvas).getByRole('grid');
const day = (canvas: HTMLElement, label: RegExp) =>
  within(grid(canvas)).getByRole('button', { name: label });

export const KeyboardGrid: Story = {
  name: 'Клавиатура: стрелки, PageUp / PageDown, Home / End',
  args: { defaultValue: '2026-10-14' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const selected = day(canvasElement, /14 октября 2026/);

    // Одна остановка Tab: после кнопок месяцев фокус сразу на выбранном дне
    await expect(
      within(grid(canvasElement))
        .getAllByRole('button')
        .filter((b) => b.tabIndex === 0),
    ).toEqual([selected]);

    selected.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expectFocused(day(canvasElement, /15 октября/));

    await userEvent.keyboard('{ArrowDown}');
    await expectFocused(day(canvasElement, /22 октября/));

    await userEvent.keyboard('{Home}');
    await expectFocused(day(canvasElement, /понедельник, 19 октября/));

    await userEvent.keyboard('{End}');
    await expectFocused(day(canvasElement, /воскресенье, 25 октября/));

    await userEvent.keyboard('{PageDown}');
    await expect(canvas.getByText('Ноябрь')).toBeInTheDocument();
    await expectFocused(day(canvasElement, /25 ноября 2026/));

    await userEvent.keyboard('{Shift>}{PageUp}{/Shift}');
    await expectFocused(day(canvasElement, /25 ноября 2025/));

    await userEvent.keyboard('{Enter}');
    await expect(args.onValueChange).toHaveBeenCalledWith('2025-11-25');
    await expect(day(canvasElement, /25 ноября 2025/).closest('td')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};

export const RespectsLimits: Story = {
  name: 'За min / max не уйти, выключенный день не выбрать',
  args: { min: '2026-10-08', max: '2026-10-30', defaultValue: '2026-10-09' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('button', { name: 'Предыдущий месяц' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Следующий месяц' })).toBeDisabled();

    day(canvasElement, /, 9 октября/).focus();
    await userEvent.keyboard('{ArrowUp}');
    await expectFocused(day(canvasElement, /, 8 октября/));

    await userEvent.click(day(canvasElement, /, 7 октября/));
    await expect(day(canvasElement, /, 7 октября/)).toHaveAttribute('aria-disabled', 'true');
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

export const MonthButtons: Story = {
  name: 'Кнопки месяцев листают, сегодня отмечено',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(day(canvasElement, /26 октября 2026/)).toHaveAttribute('aria-current', 'date');

    await userEvent.click(canvas.getByRole('button', { name: 'Следующий месяц' }));
    await expect(canvas.getByText('Ноябрь')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Предыдущий месяц' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Предыдущий месяц' }));
    await expect(canvas.getByText('Сентябрь')).toBeInTheDocument();
  },
};

export const Range: Story = {
  name: 'Диапазон на два месяца',
  args: {
    mode: 'range',
    months: 2,
    defaultValue: { start: '2026-10-19', end: '2026-11-04' },
  },
};

export const RangeBusyDays: Story = {
  name: 'Диапазон: занятые дни не перешагнуть',
  args: {
    mode: 'range',
    months: 2,
    isDateDisabled: (date) => ['2026-10-15', '2026-11-11'].includes(date),
  },
};

const rangeCell = (canvas: HTMLElement, label: RegExp) =>
  within(canvas).getByRole('button', { name: label }).closest('td')!;

export const RangeWithPointer: Story = {
  name: 'Диапазон мышью: начало, предпросмотр, конец',
  args: { mode: 'range', months: 2 },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /, 12 октября 2026/ }));
    await expect(rangeCell(canvasElement, /, 12 октября/)).toHaveAttribute('aria-selected', 'true');

    // Предпросмотр следует за курсором и тише выбора
    await userEvent.hover(canvas.getByRole('button', { name: /, 16 октября 2026/ }));
    await expect(rangeCell(canvasElement, /, 14 октября/)).toHaveAttribute('data-range', 'middle');
    await expect(rangeCell(canvasElement, /, 14 октября/)).toHaveAttribute('data-preview');

    // Второй клик раньше первого — концы меняются местами
    await userEvent.click(canvas.getByRole('button', { name: /, 8 октября 2026/ }));
    await expect(args.onValueChange).toHaveBeenCalledWith({
      start: '2026-10-08',
      end: '2026-10-12',
    });
    await expect(rangeCell(canvasElement, /, 8 октября/)).toHaveAttribute('data-range', 'start');
    await expect(rangeCell(canvasElement, /, 10 октября/)).toHaveAttribute('aria-selected', 'true');
    await expect(rangeCell(canvasElement, /, 10 октября/)).not.toHaveAttribute('data-preview');
  },
};

export const RangeWithKeyboard: Story = {
  name: 'Диапазон с клавиатуры, через границу месяцев',
  args: { mode: 'range', months: 2, defaultMonth: '2026-10-29' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByRole('button', { name: /, 29 октября 2026/ });

    start.focus();
    await userEvent.keyboard('{Enter}');

    // Стрелка с конца октября уходит в соседнюю сетку, окно месяцев не листается
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
    await expectFocused(canvas.getByRole('button', { name: /, 2 ноября 2026/ }));
    await expect(canvas.getByText('Октябрь')).toBeInTheDocument();
    await expect(rangeCell(canvasElement, /, 31 октября/)).toHaveAttribute('data-range', 'middle');

    await userEvent.keyboard('{Enter}');
    await expect(args.onValueChange).toHaveBeenCalledWith({
      start: '2026-10-29',
      end: '2026-11-02',
    });

    // За правый край — окно сдвигается на месяц, фокус остаётся видимым
    await userEvent.keyboard('{PageDown}');
    await expectFocused(canvas.getByRole('button', { name: /, 2 декабря 2026/ }));
    await expect(canvas.getByText('Ноябрь')).toBeInTheDocument();
    await expect(canvas.queryByText('Октябрь')).toBeNull();
  },
};

export const RangeStopsAtBusyDay: Story = {
  name: 'Диапазон: за занятым днём — новое начало',
  args: { ...RangeBusyDays.args },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /, 10 октября 2026/ }));
    await expect(canvas.getByRole('button', { name: /, 20 октября 2026/ })).toHaveAttribute(
      'data-unreachable',
    );

    await userEvent.click(canvas.getByRole('button', { name: /, 20 октября 2026/ }));
    await expect(args.onValueChange).not.toHaveBeenCalled();
    await expect(rangeCell(canvasElement, /, 20 октября/)).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(canvas.getByRole('button', { name: /, 22 октября 2026/ }));
    await expect(args.onValueChange).toHaveBeenCalledWith({
      start: '2026-10-20',
      end: '2026-10-22',
    });
  },
};
