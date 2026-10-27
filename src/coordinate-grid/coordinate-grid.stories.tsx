import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { CoordinateGrid, CornerFrame, Emblem, Text } from '@haunt/ui';

const meta = {
  title: 'Сигнал/CoordinateGrid',
  component: CoordinateGrid,
  tags: ['autodocs'],
  args: { cell: 32, major: 4, labels: true, crosshair: true, style: { height: 260 } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 520 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Сетка с координатами по краям — подложка для карты, схемы, пустого состояния. Столбцы A, B… AA, строки 01, 02…; число подписей следует за размером. `crosshair` — перекрестие за курсором и подпись ячейки (`C-04`), пишется прямо в DOM без рендера на каждое движение.',
      },
    },
  },
} satisfies Meta<typeof CoordinateGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithContent: Story = {
  name: 'Содержимое поверх',
  render: (args) => (
    <CoordinateGrid {...args}>
      <div style={{ position: 'absolute', left: 96 + 8, top: 64 + 8 }}>
        <CornerFrame tone="accent" inline active>
          <Emblem seed="night-raid" size={48} />
        </CornerFrame>
      </div>

      <Text mono size="sm" tone="subtle" style={{ position: 'absolute', right: 8, bottom: 6 }}>
        D-03 · точка сбора
      </Text>
    </CoordinateGrid>
  ),
};

export const WithoutLabels: Story = {
  args: { labels: false, crosshair: false },
};

export const LabelsFollowSize: Story = {
  name: 'Подписи по размеру',
  args: { style: { width: 32 * 5 + 18 + 2, height: 32 * 3 + 18 + 2 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(canvas.getByText('E')).toBeInTheDocument());
    await expect(canvas.queryByText('F')).toBeNull();
    await expect(canvas.getByText('03')).toBeInTheDocument();
    await expect(canvas.queryByText('04')).toBeNull();
  },
};

export const CrosshairReadout: Story = {
  name: 'Перекрестие подписывает ячейку',
  play: async ({ canvasElement }) => {
    const field = canvasElement.querySelector('[class*="field"]') as HTMLElement;
    const rect = field.getBoundingClientRect();

    field.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: rect.left + 32 * 2 + 5,
        clientY: rect.top + 32 * 3 + 5,
      }),
    );

    await waitFor(() => expect(field).toHaveAttribute('data-crosshair'));
    await expect(within(field).getByText('C-04', { ignore: false })).toBeInTheDocument();
  },
};
