import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { DataPlate, serialFromSeed } from '@haunt/ui';

const meta = {
  title: 'Сигнал/DataPlate',
  component: DataPlate,
  tags: ['autodocs'],
  args: {
    index: 'A-07',
    title: 'Ночной рейд · характеристики',
    items: [
      { id: 'date', label: 'Дата', value: '07.11.2026', mono: true },
      { id: 'time', label: 'Сбор', value: '21:00 MSK', mono: true },
      { id: 'slots', label: 'Места', value: '12 / 16', mono: true, tone: 'accent' },
      { id: 'voice', label: 'Голос', value: 'штаб' },
      { id: 'risk', label: 'Сложность', value: 'высокая', tone: 'warning' },
    ],
    serial: serialFromSeed('night-raid', { prefix: 'HNT' }),
  },
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
          'Табличка характеристик, как шильдик на упаковке: шапка с индексом, пары «ключ — значение» (`<dl>`) через штрих-пунктир (`--dash`), серийник и мелкий штрихкод Code 128. `serialFromSeed` — серийник для вида по seed.',
      },
    },
  },
} satisfies Meta<typeof DataPlate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutHeader: Story = {
  args: { index: undefined, title: undefined },
};

export const WithoutBarcode: Story = {
  args: { barcode: false },
};

export const LongValues: Story = {
  name: 'Длинные значения',
  args: {
    items: [
      { id: 'name', label: 'Канал', value: 'очень-длинное-название-голосового-канала-штаба' },
      { id: 'id', label: 'ID', value: '0198f4c2-7a1e-7c3b-9d51-2f6e8a90b4c7', mono: true },
    ],
  },
};

export const PairsForScreenReaders: Story = {
  name: 'Пары термин — значение',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getAllByRole('term')).toHaveLength(5);
    await expect(canvas.getAllByRole('definition')).toHaveLength(5);
    await expect(canvas.getByRole('img', { name: /Штрихкод HNT-/ })).toBeVisible();
  },
};
