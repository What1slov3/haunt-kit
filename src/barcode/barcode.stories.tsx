import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Barcode, Inline } from '@haunt/ui';

const meta = {
  title: 'Сигнал/Barcode',
  component: Barcode,
  tags: ['autodocs'],
  args: { value: 'HNT-7K2Q-X9MD', showValue: true },
  parameters: {
    docs: {
      description: {
        component:
          'Штрихкод Code 128 B из строки: таблица символов, контрольная сумма и раскладка — чистые функции (`barcode/code128.ts`), сверены с эталонными кодировками. Только печатный ASCII: строка с кириллицей не рисуется. `plate` — светлая плашка, чтобы сканер читал код в тёмной теме.',
      },
    },
  },
} satisfies Meta<typeof Barcode>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Plate: Story = {
  args: { plate: true },
};

export const Small: Story = {
  name: 'Мелкий, в табличке',
  args: { height: 16, moduleWidth: 1, quietZone: 0, showValue: false },
};

export const Sizes: Story = {
  name: 'Размеры модуля',
  render: (args) => (
    <Inline gap={4} align="end">
      <Barcode {...args} moduleWidth={1} height={24} />
      <Barcode {...args} moduleWidth={2} height={40} />
      <Barcode {...args} moduleWidth={3} height={56} />
    </Inline>
  ),
};

export const UnsupportedText: Story = {
  name: 'Кириллица — не рисуется',
  args: { value: 'Билет 42' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('img')).toBeNull();
  },
};

// «A»: старт B, A, контрольный и стоп — 46 модулей плюс тихие зоны по 10; по три штриха на символ и
// четыре у стопа — 13 прямоугольников: символ кончается пробелом, соседние штрихи не склеиваются
export const RendersBars: Story = {
  name: 'Штрихи по таблице',
  args: { value: 'A', showValue: false },
  play: async ({ canvasElement }) => {
    const svg = within(canvasElement).getByRole('img', { name: 'Штрихкод A' }).querySelector('svg');

    await expect(svg?.getAttribute('viewBox')).toBe('0 0 66 1');
    await expect(svg?.querySelectorAll('rect')).toHaveLength(13);
  },
};
