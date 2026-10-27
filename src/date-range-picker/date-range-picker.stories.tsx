import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DateRangePicker, Field, type DateRangePickerProps } from '@haunt/ui';

import {
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface ReportPeriodProps extends DateRangePickerProps {
  hint?: string;
  error?: string;
}

/** Период журнала аудита в поле формы: метка, подсказка и ошибка — от Field */
function ReportPeriod({
  hint = 'События за выбранные дни, включительно',
  error,
  ...props
}: ReportPeriodProps) {
  return (
    <div style={{ maxWidth: 320 }}>
      <Field label="Период" hint={hint} error={error}>
        <DateRangePicker fullWidth {...props} />
      </Field>
    </div>
  );
}

const meta = {
  title: 'Поля/DateRangePicker',
  component: ReportPeriod,
  subcomponents: { DateRangePicker },
  tags: ['autodocs'],
  // «Сегодня» закреплено: пресеты и проверки не должны зависеть от дня прогона
  args: { today: '2026-10-26', onValueChange: fn() },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    presets: { control: false },
    isDateDisabled: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Поле периода: триггер в рамке поля (как у `DatePicker`) и поповер с `Calendar mode="range"` на два месяца и пресетами слева («Сегодня», «7 дней», «30 дней», «Этот месяц» — данными, `presets`; функция «сегодня → период», так что окно, открытое через полночь, считает от нового дня). Пресет, выходящий за `min` / `max`, обрезается, а без дней или с занятым днём внутри — выключен. Подпись — `Intl.formatRange`: «1–7 октября 2026 г.». Выбор второго конца или пресета закрывает поповер, фокус — в поле. Очистка — крестик и Backspace / Delete. Для форм — два скрытых поля `nameStart` / `nameEnd`.',
      },
    },
  },
} satisfies Meta<typeof ReportPeriod>;

export default meta;

type Story = StoryObj<typeof meta>;

const docsFrame = { docs: { story: { inline: false, height: '440px' } } };

export const Default: Story = {};

export const WithValue: Story = {
  args: { defaultValue: { start: '2026-10-05', end: '2026-10-11' } },
};

export const AcrossMonths: Story = {
  name: 'Через границу месяцев',
  args: { defaultValue: { start: '2026-10-28', end: '2026-11-03' } },
};

export const Invalid: Story = {
  args: { error: 'Не больше 90 дней', defaultValue: { start: '2026-05-01', end: '2026-10-26' } },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: { start: '2026-10-05', end: '2026-10-11' } },
};

export const Open: Story = {
  args: {
    open: true,
    defaultValue: { start: '2026-10-19', end: '2026-10-26' },
    max: '2026-10-26',
  },
  parameters: docsFrame,
};

export const WithoutPresets: Story = {
  name: 'Без пресетов',
  args: { open: true, presets: [] },
  parameters: docsFrame,
};

const trigger = (canvas: HTMLElement) => within(canvas).getByRole('button', { name: 'Период' });
const picker = () => screen().queryByRole('dialog', { name: 'Выбор периода' });
const day = (label: RegExp) => within(picker()!).getByRole('button', { name: label });

export const PicksRange: Story = {
  name: 'Открыть, выбрать два конца, фокус в поле',
  play: async ({ args, canvasElement }) => {
    await expect(trigger(canvasElement)).toHaveTextContent('Выберите период');
    await expect(trigger(canvasElement)).toHaveAccessibleDescription(
      'События за выбранные дни, включительно',
    );

    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('dialog', { name: 'Выбор периода' }));
    await expectFocused(day(/26 октября 2026/));

    // Два месяца рядом
    await expect(within(picker()!).getAllByRole('grid')).toHaveLength(2);

    await userEvent.click(day(/, 3 ноября 2026/));
    await expect(args.onValueChange).not.toHaveBeenCalled();
    await userEvent.click(day(/, 28 октября 2026/));

    await expectGone(picker);
    await expect(args.onValueChange).toHaveBeenCalledWith({
      start: '2026-10-28',
      end: '2026-11-03',
    });
    await expect(trigger(canvasElement)).toHaveTextContent(/28 октября\s–\s3 ноября 2026/);
    await expectFocused(trigger(canvasElement));
  },
};

export const PicksPreset: Story = {
  name: 'Пресет выбирает и закрывает',
  args: { min: '2026-10-10' },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('dialog', { name: 'Выбор периода' }));

    const presets = within(screen().getByRole('group', { name: 'Быстрый выбор' }));

    // 30 дней назад упираются в min — пресет обрезан, а не выключен
    await userEvent.click(presets.getByRole('button', { name: '30 дней' }));

    await expectGone(picker);
    await expect(args.onValueChange).toHaveBeenCalledWith({
      start: '2026-10-10',
      end: '2026-10-26',
    });

    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('dialog', { name: 'Выбор периода' }));
    await expect(
      within(screen().getByRole('group', { name: 'Быстрый выбор' })).getByRole('button', {
        name: '30 дней',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await pressEscape();
    await expectGone(picker);
    await expectFocused(trigger(canvasElement));
  },
};

export const PresetUnavailable: Story = {
  name: 'Пресет с занятым днём внутри выключен',
  args: { isDateDisabled: (date) => date === '2026-10-22' },
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('dialog', { name: 'Выбор периода' }));

    const presets = within(screen().getByRole('group', { name: 'Быстрый выбор' }));

    await expect(presets.getByRole('button', { name: '7 дней' })).toBeDisabled();
    await expect(presets.getByRole('button', { name: 'Сегодня' })).toBeEnabled();

    await pressEscape();
    await expectGone(picker);
  },
};

export const ClearsAndSubmits: Story = {
  name: 'Очистка и скрытые поля формы',
  args: {
    nameStart: 'from',
    nameEnd: 'to',
    defaultValue: { start: '2026-10-05', end: '2026-10-11' },
  },
  render: (args) => (
    <form aria-label="Отчёт">
      <ReportPeriod {...args} />
    </form>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const form = canvas.getByRole('form', { name: 'Отчёт' }) as HTMLFormElement;

    await expect(new FormData(form).get('from')).toBe('2026-10-05');
    await expect(new FormData(form).get('to')).toBe('2026-10-11');

    trigger(canvasElement).focus();
    await userEvent.keyboard('{Backspace}');

    await expect(args.onValueChange).toHaveBeenLastCalledWith(null);
    await expect(trigger(canvasElement)).toHaveTextContent('Выберите период');
    await expect(new FormData(form).get('from')).toBe('');
    await expect(canvas.queryByRole('button', { name: 'Очистить период' })).toBeNull();
  },
};
