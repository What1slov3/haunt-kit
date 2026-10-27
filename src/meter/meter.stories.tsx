import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Meter, Stack } from '@haunt/ui';

const meta = {
  title: 'Данные/Meter',
  component: Meter,
  tags: ['autodocs'],
  args: {
    value: 6.2,
    max: 10,
    warning: 8,
    danger: 9.5,
    label: 'Хранилище, ГБ',
    size: 'md',
  },
  argTypes: { value: { control: { type: 'range', min: 0, max: 10, step: 0.1 } } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Шкала заполненности — лимиты пространства (место под файлы, участники голосового, слоты ролей). Тон меняется на порогах `warning` / `danger` (включительно), риски порогов — на шкале. Подпись значения моно, по умолчанию «6,2 / 10». `role="meter"` с `aria-valuetext`. Для хода процесса — `Progress`. `direction="low-is-bad"` — мало плохо (заряд, свободное место): тон включается, когда значение опустилось до порога. `segments={10}` — шкала делениями (TUI): пустые деления в зоне порога подкрашены её тоном, без TUI деления сливаются в обычную шкалу.',
      },
    },
  },
} satisfies Meta<typeof Meter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const meter = within(canvasElement).getByRole('meter', { name: 'Хранилище, ГБ' });

    await expect(meter).toHaveAttribute('aria-valuenow', '6.2');
    await expect(meter).toHaveAttribute('data-tone', 'accent');
  },
};

export const Warning: Story = {
  args: { value: 8.4 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('meter')).toHaveAttribute('data-tone', 'warning');
  },
};

export const Danger: Story = {
  args: { value: 9.8 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('meter')).toHaveAttribute('data-tone', 'danger');
  },
};

export const States: Story = {
  name: 'Лимиты пространства',
  render: () => (
    <Stack gap={4}>
      <Meter label="Участники голосового" value={18} max={25} warning={20} danger={25} />
      <Meter label="Роли" value={47} max={50} warning={40} danger={48} />
      <Meter
        label="Вложения за месяц"
        value={9.6}
        max={10}
        warning={8}
        danger={9.5}
        valueLabel="9,6 из 10 ГБ"
      />
      <Meter label="Без подписи значения" value={30} valueLabel={false} size="sm" />
    </Stack>
  ),
};

export const CustomValueText: Story = {
  name: 'Своя подпись значения',
  args: { value: 3, max: 5, warning: 4, danger: 5, label: 'Слоты ботов', valueLabel: '3 из 5' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('meter')).toHaveAttribute(
      'aria-valuetext',
      '3 из 5',
    );
  },
};

export const LowIsBad: Story = {
  name: 'Мало — плохо: заряд, свободное место',
  args: {
    label: 'Заряд',
    value: 18,
    max: 100,
    warning: 30,
    danger: 10,
    direction: 'low-is-bad',
    valueLabel: '18 %',
  },
  play: async ({ canvasElement }) => {
    const meter = within(canvasElement).getByRole('meter', { name: 'Заряд' });

    await expect(meter).toHaveAttribute('data-tone', 'warning');
    await expect(meter).toHaveAttribute('data-direction', 'low-is-bad');
  },
};

export const LowIsBadStates: Story = {
  name: 'Мало — плохо: все тона',
  render: () => (
    <Stack gap={4}>
      <Meter
        label="Свободно, ГБ"
        value={7.4}
        max={10}
        warning={2}
        danger={0.5}
        direction="low-is-bad"
      />
      <Meter
        label="Свободно, ГБ"
        value={1.6}
        max={10}
        warning={2}
        danger={0.5}
        direction="low-is-bad"
      />
      <Meter
        label="Свободно, ГБ"
        value={0.3}
        max={10}
        warning={2}
        danger={0.5}
        direction="low-is-bad"
      />
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const tones = within(canvasElement)
      .getAllByRole('meter')
      .map((meter) => meter.getAttribute('data-tone'));

    await expect(tones).toEqual(['accent', 'warning', 'danger']);
  },
};

export const Segmented: Story = {
  name: 'Делениями (TUI)',
  args: { value: 6.2, segments: 10 },
  play: async ({ canvasElement }) => {
    const meter = within(canvasElement).getByRole('meter');
    const cells = meter.querySelectorAll('[data-filled]');

    await expect(cells).toHaveLength(6);
    // Порог виден зоной: деления 8–10 подкрашены, рисок поверх делений нет
    await expect(meter.querySelectorAll('[data-zone]')).toHaveLength(2);
  },
};

export const SegmentedBattery: Story = {
  name: 'Делениями: заряд',
  render: () => (
    <Stack gap={4}>
      <Meter
        label="Заряд"
        value={86}
        warning={30}
        danger={10}
        direction="low-is-bad"
        segments={10}
      />
      <Meter
        label="Заряд"
        value={24}
        warning={30}
        danger={10}
        direction="low-is-bad"
        segments={10}
      />
      <Meter
        label="Заряд"
        value={3}
        warning={30}
        danger={10}
        direction="low-is-bad"
        segments={10}
      />
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const [, , low] = within(canvasElement).getAllByRole('meter');

    // 3 % — одно горящее деление, а не пустая шкала
    await expect(low!.querySelectorAll('[data-filled]')).toHaveLength(1);
    await expect(low).toHaveAttribute('data-tone', 'danger');
  },
};
