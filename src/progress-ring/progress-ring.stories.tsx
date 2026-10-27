import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText } from 'lucide-react';
import { expect, within } from 'storybook/test';

import { Icon, Inline, ProgressRing } from '@haunt/ui';

const meta = {
  title: 'Данные/ProgressRing',
  component: ProgressRing,
  tags: ['autodocs'],
  args: { value: 64, size: 'md', tone: 'accent', label: 'Загрузка файла' },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    center: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Круговой прогресс на SVG: 20 / 40 / 64 px, процент в центре моно (у `md` и `lg`), `center` — своё содержимое. Без значения — неопределённое: четверть дуги вращается и, как `Spinner`, не гаснет при `prefers-reduced-motion` — иначе «грузится» не отличить от «зависло». Длина дуги меняется через `stroke-dashoffset` (обоснование — в модуле стилей).',
      },
    },
  },
} satisfies Meta<typeof ProgressRing>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const ring = within(canvasElement).getByRole('progressbar', { name: 'Загрузка файла' });

    await expect(ring).toHaveAttribute('aria-valuenow', '64');
    await expect(ring).toHaveTextContent('64%');
  },
};

export const Sizes: Story = {
  render: (args) => (
    <Inline gap={4}>
      <ProgressRing {...args} size="sm" />
      <ProgressRing {...args} size="md" />
      <ProgressRing {...args} size="lg" />
    </Inline>
  ),
};

export const Tones: Story = {
  render: (args) => (
    <Inline gap={4}>
      <ProgressRing {...args} tone="accent" value={30} />
      <ProgressRing {...args} tone="success" value={100} />
      <ProgressRing {...args} tone="warning" value={85} />
      <ProgressRing {...args} tone="danger" value={12} />
    </Inline>
  ),
};

export const Indeterminate: Story = {
  args: { value: null, label: 'Подготовка' },
  render: (args) => (
    <Inline gap={4}>
      <ProgressRing {...args} size="sm" />
      <ProgressRing {...args} size="md" />
      <ProgressRing {...args} size="lg" />
    </Inline>
  ),
  play: async ({ canvasElement }) => {
    const [ring] = within(canvasElement).getAllByRole('progressbar');

    await expect(ring).not.toHaveAttribute('aria-valuenow');
    await expect(ring).toHaveAttribute('data-state', 'indeterminate');
  },
};

export const CustomCenter: Story = {
  name: 'Своё содержимое в центре',
  args: { size: 'lg', value: 40, center: <Icon icon={FileText} size="lg" /> },
};
