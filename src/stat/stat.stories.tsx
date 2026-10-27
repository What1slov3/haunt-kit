import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Grid, NumberTicker, Sparkline, Stat, Surface } from '@haunt/ui';

const meta = {
  title: 'Данные/Stat',
  component: Stat,
  tags: ['autodocs'],
  args: {
    label: 'Участники',
    value: '1 240',
    change: 12.5,
    changeFormat: 'percent',
    goodDirection: 'up',
    hint: 'за 7 дней',
    size: 'md',
  },
  argTypes: {
    value: { control: 'text' },
    chart: { control: false },
    changeFormat: { control: 'inline-radio', options: ['percent', 'number'] },
    goodDirection: { control: 'inline-radio', options: ['up', 'down'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Показатель статистики сообщества: подпись моно-капителью (через `--font-tui` — гротеском без TUI), значение крупно табличными цифрами, изменение ▲/▼ с тоном. `goodDirection="down"` — для метрик, где меньше лучше (жалобы, время ответа). Скринридер слышит «рост +12,5 %», а не цвет и стрелку. `chart` — слот под `Sparkline`, `value` — любой узел, например `NumberTicker`.',
      },
    },
  },
} satisfies Meta<typeof Stat>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/рост/)).toBeInTheDocument();
  },
};

export const Decrease: Story = {
  name: 'Падение',
  args: { label: 'Сообщений в день', value: '3 412', change: -8.2 },
};

export const LowerIsBetter: Story = {
  name: 'Меньше — лучше',
  args: {
    label: 'Время ответа модераторов',
    value: '4 мин',
    change: -22,
    goodDirection: 'down',
    hint: 'медиана',
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/снижение/)).toBeInTheDocument();
  },
};

export const WithSparkline: Story = {
  name: 'С линией тренда',
  args: {
    chart: <Sparkline data={[820, 860, 905, 990, 1040, 1180, 1240]} tone="success" fill />,
  },
};

export const Dashboard: Story = {
  name: 'Панель статистики',
  render: () => (
    <Surface level={1} style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-2xl)' }}>
      <Grid minColumnWidth="200px" gap={6}>
        <Stat
          label="Участники"
          value={<NumberTicker value={1240} />}
          change={12.5}
          hint="за 7 дней"
          chart={<Sparkline data={[820, 860, 905, 990, 1040, 1180, 1240]} tone="success" fill />}
        />
        <Stat
          label="Онлайн сейчас"
          value={<NumberTicker value={318} />}
          change={0}
          hint="как вчера"
          chart={<Sparkline data={[300, 320, 310, 318]} tone="neutral" />}
        />
        <Stat
          label="Жалобы"
          value={<NumberTicker value={7} />}
          change={3}
          changeFormat="number"
          goodDirection="down"
          hint="за неделю"
          chart={<Sparkline data={[2, 3, 4, 3, 5, 6, 7]} tone="danger" fill />}
        />
      </Grid>
    </Surface>
  ),
};

export const Large: Story = {
  args: { size: 'lg', label: 'Всего сообщений', value: '1,2 млн', change: 4.1, hint: 'за месяц' },
};
