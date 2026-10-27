import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Field, Stack, TimePicker, type TimePickerProps } from '@haunt/ui';

import {
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface StartTimeProps extends TimePickerProps {
  hint?: string;
  error?: string;
}

/** Время начала события в поле формы: метка, подсказка и ошибка — от Field */
function StartTime({ hint = 'По времени пространства', error, ...props }: StartTimeProps) {
  return (
    <div style={{ maxWidth: 200 }}>
      <Field label="Начало" hint={hint} error={error}>
        <TimePicker fullWidth {...props} />
      </Field>
    </div>
  );
}

const meta = {
  title: 'Поля/TimePicker',
  component: StartTime,
  subcomponents: { TimePicker },
  tags: ['autodocs'],
  args: { onValueChange: fn() },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    hourCycle: { control: 'inline-radio', options: ['h23', 'h12'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Поле времени: сегменты часов и минут моно-цифрами в рамке поля. ↑ / ↓ меняют сегмент (минуты — с шагом `step`, по умолчанию 15, по кругу без переноса в часы), цифры набираются с автопереходом (`1` ждёт вторую цифру, `3` — сразу 03 и дальше), ← / → и `:` — между сегментами, Backspace очищает сегмент, вставка «14:30» — целиком. Список вариантов с тем же шагом — кнопка с часами или Alt+↓. Значение — строка `HH:MM` (24 ч), как `IsoDate` у дат; `min` / `max` зажимают на уходе фокуса, пока поле подсвечено ошибкой. `hourCycle="h12"` — 1–12 и сегмент AM / PM, подписи из Intl. `name` — скрытый `<input>`.',
      },
    },
  },
} satisfies Meta<typeof StartTime>;

export default meta;

type Story = StoryObj<typeof meta>;

const docsFrame = { docs: { story: { inline: false, height: '360px' } } };

export const Default: Story = {};

export const WithValue: Story = { args: { defaultValue: '19:30' } };

export const TwelveHour: Story = {
  name: '12 часов (en-US)',
  args: { defaultValue: '19:30', hourCycle: 'h12', locale: 'en-US' },
};

export const Invalid: Story = { args: { error: 'Событие уже началось', defaultValue: '09:00' } };

export const Disabled: Story = { args: { disabled: true, defaultValue: '19:30' } };

export const Sizes: Story = {
  render: (args) => (
    <Stack gap={2} style={{ maxWidth: 160 }}>
      <TimePicker {...args} size="sm" hourLabel="sm" defaultValue="09:00" />
      <TimePicker {...args} size="md" hourLabel="md" defaultValue="09:00" />
      <TimePicker {...args} size="lg" hourLabel="lg" defaultValue="09:00" />
    </Stack>
  ),
};

export const OpenList: Story = {
  name: 'Список вариантов, рабочие часы',
  args: { open: true, defaultValue: '14:00', min: '09:00', max: '18:00', step: 30 },
  parameters: docsFrame,
};

const hour = (canvas: HTMLElement) => within(canvas).getByRole('spinbutton', { name: 'Начало' });
const minute = (canvas: HTMLElement) => within(canvas).getByRole('spinbutton', { name: 'Минуты' });
const list = () => screen().queryByRole('listbox', { name: 'Выбор времени' });

export const TypesWithAutoAdvance: Story = {
  name: 'Ввод цифр с автопереходом',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(hour(canvasElement));
    await userEvent.keyboard('1');
    await expect(hour(canvasElement)).toHaveValue('01');
    await expectFocused(hour(canvasElement));

    await userEvent.keyboard('4');
    await expect(hour(canvasElement)).toHaveValue('14');
    await expectFocused(minute(canvasElement));

    await userEvent.keyboard('7');
    await expect(minute(canvasElement)).toHaveValue('07');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('14:07');

    // Пока набран только час — значения нет; на уходе фокуса минуты достраиваются нулём
    await userEvent.keyboard('{Backspace}');
    await expect(args.onValueChange).toHaveBeenLastCalledWith(null);
    await userEvent.tab();
    await expect(minute(canvasElement)).toHaveValue('00');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('14:00');
  },
};

export const ArrowsAndStep: Story = {
  name: 'Стрелки: сегмент, шаг минут, ← / →',
  args: { defaultValue: '09:07', step: 15 },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(minute(canvasElement));
    await userEvent.keyboard('{ArrowUp}');
    await expect(minute(canvasElement)).toHaveValue('15');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('09:15');

    await userEvent.keyboard('{ArrowLeft}');
    await expectFocused(hour(canvasElement));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(hour(canvasElement)).toHaveValue('07');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('07:15');

    // По кругу без переноса: 00 ↓ — 23
    await userEvent.keyboard('0{ArrowLeft}{ArrowDown}');
    await expect(hour(canvasElement)).toHaveValue('23');
  },
};

export const ClampsToLimits: Story = {
  name: 'min / max: ошибка при вводе, зажим на уходе',
  args: { min: '09:00', max: '18:00', defaultValue: '10:00' },
  play: async ({ args, canvasElement }) => {
    const frame = hour(canvasElement).closest('[role="group"]')!;

    await userEvent.click(hour(canvasElement));
    await userEvent.keyboard('20');
    await expect(frame).toHaveAttribute('data-invalid');
    await expect(args.onValueChange).not.toHaveBeenCalledWith('20:00');

    await userEvent.tab();
    await userEvent.tab();
    await expect(hour(canvasElement)).toHaveValue('18');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('18:00');
    await expect(frame).not.toHaveAttribute('data-invalid');
  },
};

export const PicksFromList: Story = {
  name: 'Список: Alt+↓, стрелки, Enter',
  args: { defaultValue: '10:10', step: 30, min: '09:00', max: '12:00', name: 'start' },
  render: (args) => (
    <form aria-label="Событие">
      <StartTime {...args} />
    </form>
  ),
  play: async ({ args, canvasElement }) => {
    const form = within(canvasElement).getByRole('form', { name: 'Событие' }) as HTMLFormElement;

    await expect(new FormData(form).get('start')).toBe('10:10');

    hour(canvasElement).focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await expectVisible(await screen().findByRole('listbox', { name: 'Выбор времени' }));

    // Список встал на ближайший вариант и держит фокус
    await expectFocused(list()!);
    await expect(within(list()!).getByRole('option', { name: /10:00/ })).toHaveAttribute(
      'data-highlighted',
    );
    await expect(within(list()!).getAllByRole('option')).toHaveLength(7);

    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expectGone(list);
    await expect(args.onValueChange).toHaveBeenLastCalledWith('10:30');
    await expect(hour(canvasElement)).toHaveValue('10');
    await expect(minute(canvasElement)).toHaveValue('30');
    await expect(new FormData(form).get('start')).toBe('10:30');
  },
};

export const ListClosesOnEscape: Story = {
  name: 'Список закрывается по Esc',
  args: { defaultValue: '19:30' },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Выбор времени' }));
    await expectVisible(await screen().findByRole('listbox', { name: 'Выбор времени' }));
    await expect(within(list()!).getByRole('option', { selected: true })).toHaveTextContent(
      '19:30',
    );

    await pressEscape();
    await expectGone(list);
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

export const TwelveHourTyping: Story = {
  name: '12 часов: период — свой сегмент',
  args: { hourCycle: 'h12', locale: 'en-US', defaultValue: '09:15' },
  play: async ({ args, canvasElement }) => {
    const period = within(canvasElement).getByRole('spinbutton', {
      name: 'До или после полудня',
    });

    await expect(hour(canvasElement)).toHaveValue('09');
    await expect(period).toHaveValue('AM');

    await userEvent.click(period);
    await userEvent.keyboard('p');
    await expect(period).toHaveValue('PM');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('21:15');

    await userEvent.click(hour(canvasElement));
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    await expect(hour(canvasElement)).toHaveValue('12');
    await expect(period).toHaveValue('PM');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('12:15');
  },
};
