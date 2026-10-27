import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Stack, Text, TuiSpinner } from '@haunt/ui';

const meta = {
  title: 'TUI/TuiSpinner',
  component: TuiSpinner,
  tags: ['autodocs'],
  args: { variant: 'braille', label: 'Загрузка' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['braille', 'line', 'dots'] },
    interval: { control: { type: 'range', min: 40, max: 600, step: 20 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Спиннер «по-терминальному»: кадры `braille` ⠋⠙⠹…, `line` |/-\\, `dots`. Кадры сменяет CSS (`steps()` по столбцу кадров, только transform) — таймера в JS нет. Как `Spinner`, не гаснет при `prefers-reduced-motion` (`data-motion-keep`): смена знака на месте — не движение, а без неё «грузится» неотличимо от «зависло». Эффекты на него не влияют — это индикатор, не украшение. При `data-tui="off"` (кнопка TUI в тулбаре) — обычный `Spinner`.',
      },
    },
  },
} satisfies Meta<typeof TuiSpinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status', { name: 'Загрузка' })).toBeVisible();
  },
};

export const Variants: Story = {
  render: (args) => (
    <Stack gap={2}>
      <TuiSpinner {...args} variant="braille">
        braille
      </TuiSpinner>
      <TuiSpinner {...args} variant="line">
        line
      </TuiSpinner>
      <TuiSpinner {...args} variant="dots">
        dots
      </TuiSpinner>
    </Stack>
  ),
};

export const WithCaption: Story = {
  name: 'С подписью',
  args: { children: 'подключение к голосу', label: 'Подключение к голосу' },
  render: (args) => (
    <Text size="sm">
      <TuiSpinner {...args} />
    </Text>
  ),
};

export const WithoutTui: Story = {
  name: 'Без TUI — обычный Spinner',
  args: { children: 'сборка' },
  decorators: [
    (Story) => (
      <div data-tui="off">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status', { name: 'Загрузка' });
    const frames = status.firstElementChild as HTMLElement;
    const fallback = status.children[1] as HTMLElement;

    await expect(getComputedStyle(frames).display).toBe('none');
    // Флекс-ребёнок блокифицируется: inline-block вычисляется в block — проверяем, что виден
    await expect(getComputedStyle(fallback).display).not.toBe('none');
  },
};
