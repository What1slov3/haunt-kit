import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ChamferPanel, Emblem, Inline, Stack, Text } from '@haunt/ui';

const seeds = [
  'night-raid',
  'haunt',
  'space-0042',
  'Лаборатория',
  'склад',
  'штаб',
  'orbit',
  'pulse',
];

const meta = {
  title: 'Сигнал/Emblem',
  component: Emblem,
  tags: ['autodocs'],
  args: { seed: 'night-raid', size: 96, tone: 'accent', label: 'Эмблема «Ночной рейд»' },
  parameters: {
    docs: {
      description: {
        component:
          'Процедурная эмблема пространства по seed — заглушка вместо логотипа. Знак с поворотной симметрией 3–8: внешнее кольцо, 2–3 детали в непересекающихся кольцах, центр и одна деталь цвета акцента. Детерминирована: одна строка — один знак на всех экранах (`emblem/emblem-shapes.ts`, тесты).',
      },
    },
  },
} satisfies Meta<typeof Emblem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mono: Story = {
  args: { tone: 'mono' },
};

export const Gallery: Story = {
  name: 'Разные seed',
  render: (args) => (
    <Inline gap={3} wrap>
      {seeds.map((seed) => (
        <ChamferPanel key={seed} corners={['tr']} size="sm" style={{ padding: 12 }}>
          <Stack gap={2} align="center">
            <Emblem {...args} seed={seed} size={64} label={undefined} />

            <Text mono size="xs" tone="subtle">
              {seed}
            </Text>
          </Stack>
        </ChamferPanel>
      ))}
    </Inline>
  ),
};

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <Inline gap={3} align="end">
      {[16, 24, 32, 48, 96].map((size) => (
        <Emblem key={size} {...args} size={size} label={undefined} />
      ))}
    </Inline>
  ),
};

export const Deterministic: Story = {
  name: 'Один seed — один знак',
  render: (args) => (
    <Inline gap={3}>
      <Emblem {...args} label="Первый" />
      <Emblem {...args} label="Второй" />
    </Inline>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole('img', { name: 'Первый' });
    const second = canvas.getByRole('img', { name: 'Второй' });

    await expect(first.innerHTML).toBe(second.innerHTML);
  },
};
