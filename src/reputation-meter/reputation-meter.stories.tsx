import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ReputationMeter } from '@haunt/ui';

const tiers = [
  { from: 0, label: 'Новичок' },
  { from: 100, label: 'Свой' },
  { from: 500, label: 'Опора' },
  { from: 800, label: 'Легенда' },
];

const meta = {
  title: 'Сообщество/ReputationMeter',
  component: ReputationMeter,
  tags: ['autodocs'],
  args: {
    value: 420,
    history: [300, 320, 310, 360, 390, 405, 420],
    deltaLabel: 'за неделю',
    tiers,
  },
  argTypes: { history: { control: false }, tiers: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Репутация: число (`NumberTicker`), изменение за период со стрелкой и тоном, мини-история `Sparkline` с подсказкой, шкала (`role="meter"`) с засечками ступеней и названием текущей. Изменение — `delta` или из истории. Шкала через ноль (`min < 0`) заливается от нуля: минус читается минусом.',
      },
    },
  },
} satisfies Meta<typeof ReputationMeter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Growing: Story = {
  name: 'Растёт',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('meter', { name: 'Репутация' })).toHaveAttribute(
      'aria-valuetext',
      '420, Свой',
    );
    await expect(canvas.getByText('выросла на 120')).toBeInTheDocument();
    await expect(canvas.getByText('Свой')).toBeVisible();
  },
};

export const Falling: Story = {
  name: 'Падает',
  args: { value: 380, history: [430, 420, 400, 395, 380] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('упала на 50')).toBeInTheDocument();
  },
};

export const Diverging: Story = {
  name: 'Шкала через ноль, минус',
  args: {
    value: -35,
    min: -100,
    max: 100,
    tiers: undefined,
    history: [10, 0, -20, -35],
    deltaLabel: undefined,
  },
};

export const NoHistory: Story = { name: 'Без истории', args: { history: undefined, delta: 12 } };

export const TopTier: Story = {
  name: 'Вершина',
  args: { value: 960, history: undefined, delta: 0 },
};
