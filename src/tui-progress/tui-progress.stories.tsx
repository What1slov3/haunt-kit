import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Stack, Text, TuiProgress } from '@haunt/ui';

const meta = {
  title: 'TUI/TuiProgress',
  component: TuiProgress,
  tags: ['autodocs'],
  args: {
    value: 54,
    width: 20,
    variant: 'blocks',
    showValue: true,
    tone: 'accent',
    label: 'Загрузка',
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    width: { control: { type: 'range', min: 4, max: 60 } },
    variant: { control: 'inline-radio', options: ['blocks', 'ascii'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Полоса прогресса символами: `blocks` — █ заполнено на ровной приглушённой дорожке, переходная клетка ▏…▉ с шагом в 1/8 клетки ложится на неё без зазора; `ascii` — `[####----]` (скобки — токены словаря TUI). Ширина — в символах, процент справа одной ширины. Без значения — по дорожке шагает блок; как `TuiSpinner`, он не гаснет при reduced-motion. При `data-tui="off"` — обычный `Progress`.',
      },
    },
  },
} satisfies Meta<typeof TuiProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar', { name: 'Загрузка' });

    await expect(bar).toHaveAttribute('aria-valuenow', '54');
    await expect(bar).toHaveTextContent('██████████▊ 54%');
  },
};

export const Ascii: Story = {
  args: { variant: 'ascii', value: 40, width: 16 },
};

export const Steps: Story = {
  name: 'Шкала',
  render: (args) => (
    <Stack gap={1}>
      {[0, 7, 33, 50, 81, 100].map((value) => (
        <TuiProgress
          key={value}
          {...args}
          value={value}
          tone={value === 100 ? 'success' : 'accent'}
        />
      ))}
    </Stack>
  ),
};

export const Indeterminate: Story = {
  args: { value: null, label: 'Подготовка' },
  render: (args) => (
    <Stack gap={2}>
      <TuiProgress {...args} />
      <TuiProgress {...args} variant="ascii" width={16} />
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const [bar] = within(canvasElement).getAllByRole('progressbar');

    await expect(bar).not.toHaveAttribute('aria-valuenow');
    await expect(bar).toHaveAttribute('data-state', 'indeterminate');
  },
};

export const InLog: Story = {
  name: 'В строке журнала',
  render: (args) => (
    <Text size="sm" mono>
      upload avatar.png <TuiProgress {...args} width={12} value={68} />
    </Text>
  ),
};

export const WithoutTui: Story = {
  name: 'Без TUI — обычный Progress',
  decorators: [
    (Story) => (
      <div data-tui="off" style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar', { name: 'Загрузка' });
    const symbols = bar.firstElementChild as HTMLElement;

    await expect(getComputedStyle(symbols).display).toBe('none');
    await expect(getComputedStyle(bar.lastElementChild as HTMLElement).display).toBe('block');
  },
};
