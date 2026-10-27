import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { HazardStripe, Stack } from '@haunt/ui';

const meta = {
  title: 'Сигнал/HazardStripe',
  component: HazardStripe,
  tags: ['autodocs'],
  args: { tone: 'warning', size: 'md', direction: 'right' },
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
          'Сигнальная лента — диагональные полосы: плашка «бета», граница опасной зоны настроек, «идёт работа» (`animated` — полосы ползут сдвигом `transform` на период, стоят при `data-effects="off"` и reduced-motion). С подписью — плашка посередине; без неё лента скрыта от чтения с экрана.',
      },
    },
  },
} satisfies Meta<typeof HazardStripe>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  name: 'С подписью',
  args: { children: 'бета · возможны сбои' },
};

export const Tones: Story = {
  name: 'Тона и размеры',
  render: (args) => (
    <Stack gap={3}>
      <HazardStripe {...args} tone="warning" size="sm" />
      <HazardStripe {...args} tone="danger" size="md" direction="left" />
      <HazardStripe {...args} tone="accent" size="lg" />
      <HazardStripe {...args} tone="neutral" size="lg" direction="left" />
    </Stack>
  ),
};

export const Animated: Story = {
  name: 'Ползёт',
  args: { animated: true, tone: 'accent', children: 'синхронизация' },
};

export const DecorativeIsHidden: Story = {
  name: 'Без подписи — декоративная',
  play: async ({ canvasElement }) => {
    const stripe = canvasElement.querySelector('[data-direction]');

    await expect(stripe).toHaveAttribute('aria-hidden', 'true');
    await expect(within(canvasElement).queryByText(/./)).toBeNull();
  },
};
