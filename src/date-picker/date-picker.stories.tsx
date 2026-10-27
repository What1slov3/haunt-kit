import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DatePicker, Field, Stack, type DatePickerProps } from '@haunt/ui';

import {
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface EventDateProps extends DatePickerProps {
  /** Подсказка или ошибка поля */
  hint?: string;
  error?: string;
}

/** Дата события пространства в поле формы: метка, подсказка и ошибка — от Field */
function EventDate({
  hint = 'Участники получат напоминание за день',
  error,
  ...props
}: EventDateProps) {
  return (
    <div style={{ maxWidth: 280 }}>
      <Field label="Дата события" hint={hint} error={error}>
        <DatePicker fullWidth {...props} />
      </Field>
    </div>
  );
}

const meta = {
  title: 'Поля/DatePicker',
  component: EventDate,
  subcomponents: { DatePicker },
  tags: ['autodocs'],
  // «Сегодня» закреплено: проверки не должны зависеть от дня прогона
  args: { today: '2026-10-26', onValueChange: fn() },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] } },
  parameters: {
    docs: {
      description: {
        component:
          'Поле даты: триггер в рамке поля (`field-frame`, как `Input` и `Select.Trigger`) и поповер с `Calendar`. Внутри `<Field>` связывается с меткой, подсказкой и ошибкой (`useFieldControl`). При открытии фокус — на выбранном дне (или сегодня), выбор закрывает поповер и возвращает фокус в поле. Значение — строка `YYYY-MM-DD`; показ — `Intl` по `locale` и `formatOptions`. Очистка (`clearable`, по умолчанию есть) — крестик в рамке или Backspace / Delete на поле, `onValueChange(null)`; крестик не берёт Tab — у поля одна остановка. `name` — скрытый `<input>` для форм.',
      },
    },
  },
} satisfies Meta<typeof EventDate>;

export default meta;

type Story = StoryObj<typeof meta>;

const docsFrame = { docs: { story: { inline: false, height: '400px' } } };

export const Default: Story = {};

export const WithValue: Story = { args: { defaultValue: '2026-11-07' } };

export const Invalid: Story = {
  args: { error: 'Событие не может быть в прошлом', defaultValue: '2026-10-01' },
};

export const Disabled: Story = { args: { disabled: true, defaultValue: '2026-11-07' } };

export const Sizes: Story = {
  render: (args) => (
    <Stack gap={2} style={{ maxWidth: 240 }}>
      <DatePicker {...args} size="sm" aria-label="sm" />
      <DatePicker {...args} size="md" aria-label="md" />
      <DatePicker {...args} size="lg" aria-label="lg" />
    </Stack>
  ),
};

export const Open: Story = {
  args: { open: true, defaultValue: '2026-11-07', min: '2026-10-26' },
  parameters: docsFrame,
};

const trigger = (canvas: HTMLElement) =>
  within(canvas).getByRole('button', { name: /Дата события/ });
const picker = () => screen().queryByRole('dialog', { name: 'Выбор даты' });

export const PicksWithKeyboard: Story = {
  name: 'Открыть, выбрать с клавиатуры, фокус в поле',
  play: async ({ args, canvasElement }) => {
    await expect(trigger(canvasElement)).toHaveTextContent('Выберите дату');
    await expect(trigger(canvasElement)).toHaveAccessibleDescription(
      'Участники получат напоминание за день',
    );

    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('dialog', { name: 'Выбор даты' }));

    // Без значения фокус — на сегодня
    await expectFocused(within(picker()!).getByRole('button', { name: /26 октября 2026/ }));

    await userEvent.keyboard('{ArrowRight}{Enter}');

    await expectGone(picker);
    await expect(args.onValueChange).toHaveBeenCalledWith('2026-10-27');
    await expect(trigger(canvasElement)).toHaveTextContent('27 октября 2026');
    await expectFocused(trigger(canvasElement));
  },
};

export const ClosesOnEscape: Story = {
  name: 'Esc закрывает без выбора',
  args: { defaultValue: '2026-11-07' },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('dialog', { name: 'Выбор даты' }));
    await expectFocused(within(picker()!).getByRole('button', { name: /, 7 ноября 2026/ }));

    await pressEscape();

    await expectGone(picker);
    await expectFocused(trigger(canvasElement));
    await expect(args.onValueChange).not.toHaveBeenCalled();
    await expect(trigger(canvasElement)).toHaveTextContent('7 ноября 2026');
  },
};

export const InvalidLinked: Story = {
  name: 'Ошибка Field доходит до триггера',
  args: { error: 'Выберите дату' },
  play: async ({ canvasElement }) => {
    await expect(trigger(canvasElement)).toHaveAttribute('aria-invalid', 'true');
    await expect(trigger(canvasElement)).toHaveAccessibleDescription(/Выберите дату/);
  },
};

export const ClearsValue: Story = {
  name: 'Очистка: крестик и Backspace / Delete',
  args: { defaultValue: '2026-11-07' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Очистить дату' }));
    await expect(args.onValueChange).toHaveBeenLastCalledWith(null);
    await expect(trigger(canvasElement)).toHaveTextContent('Выберите дату');
    await expectFocused(trigger(canvasElement));
    // Пусто — очищать нечего
    await expect(canvas.queryByRole('button', { name: 'Очистить дату' })).toBeNull();

    // Выбрать снова и стереть с клавиатуры
    await userEvent.keyboard('{Enter}');
    await expectVisible(await screen().findByRole('dialog', { name: 'Выбор даты' }));
    await userEvent.keyboard('{Enter}');
    await expectGone(picker);
    await expect(trigger(canvasElement)).toHaveTextContent('26 октября 2026');

    await userEvent.keyboard('{Delete}');
    await expect(trigger(canvasElement)).toHaveTextContent('Выберите дату');
    await expect(picker()).toBeNull();
  },
};

export const InForm: Story = {
  name: 'Скрытое поле формы (name)',
  args: { name: 'eventDate', defaultValue: '2026-11-07' },
  render: (args) => (
    <form aria-label="Событие" style={{ maxWidth: 280 }}>
      <EventDate {...args} />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const form = within(canvasElement).getByRole('form', { name: 'Событие' }) as HTMLFormElement;

    await expect(new FormData(form).get('eventDate')).toBe('2026-11-07');

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Очистить дату' }));
    await expect(new FormData(form).get('eventDate')).toBe('');
  },
};
