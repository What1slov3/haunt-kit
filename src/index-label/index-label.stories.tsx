import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { IndexLabel, Stack } from '@haunt/ui';

const meta = {
  title: 'Сигнал/IndexLabel',
  component: IndexLabel,
  tags: ['autodocs'],
  args: { index: 1, total: 7, label: 'правила пространства', size: 'md', tone: 'default' },
  argTypes: { label: { control: 'text' } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Номер раздела как на чертеже: `01 / 07`, `SEC-04`, `A-07 / 12` — дисплейным шрифтом стиля «сигнал» (без стиля — моно), тонкая линия и подпись моно-капителью. `formatIndex` — то же строкой.',
      },
    },
  },
} satisfies Meta<typeof IndexLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Prefix: Story = {
  args: { index: 4, total: undefined, prefix: 'SEC', label: 'голос' },
};

export const Sizes: Story = {
  name: 'Размеры и тона',
  render: (args) => (
    <Stack gap={4}>
      <IndexLabel {...args} size="sm" tone="muted" />
      <IndexLabel {...args} size="md" tone="accent" />
      <IndexLabel {...args} size="lg" />
    </Stack>
  ),
};

export const WithoutRule: Story = {
  args: { rule: false, label: undefined, index: 'B2' },
};

export const Formats: Story = {
  name: 'Формат номера',
  args: { index: 7, prefix: 'A', total: 12, label: 'склад' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('A-07 / 12')).toBeVisible();
  },
};
