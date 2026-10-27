import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ChamferPanel, Heading, IndexLabel, Inline, SignalScope, Stack, Text } from '@haunt/ui';

const meta = {
  title: 'Сигнал/ChamferPanel',
  component: ChamferPanel,
  tags: ['autodocs'],
  args: {
    corners: ['tl', 'br'],
    size: 'md',
    tone: 'default',
    children: (
      <Stack gap={2}>
        <IndexLabel index={4} prefix="SEC" label="правила" size="sm" />
        <Heading level={3}>Ночной рейд</Heading>
        <Text tone="muted">Сбор в 21:00 у южного шлюза. Голос — канал «штаб».</Text>
      </Stack>
    ),
  },
  argTypes: { children: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Панель со срезанными углами (любые из четырёх). Срез — `clip-path`, рамка повторяет срез кольцом `polygon(evenodd …)` поверх содержимого: не обводка и не цвет подложки (решение 8), поэтому на стекле и градиенте панель выглядит так же. В стиле «сигнал» срез — `--chamfer-*` (6 / 10 / 18 px), без стиля — 6 / 10 / 16 px.',
      },
    },
  },
} satisfies Meta<typeof ChamferPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Corners: Story = {
  name: 'Углы',
  render: (args) => (
    <Inline gap={3} wrap>
      {(
        [
          ['tl'],
          ['tr'],
          ['br'],
          ['bl'],
          ['tl', 'br'],
          ['tr', 'bl'],
          ['tl', 'tr', 'br', 'bl'],
        ] as const
      ).map((corners) => (
        <ChamferPanel key={corners.join()} {...args} corners={corners} style={{ width: 96 }}>
          <Text mono size="sm">
            {corners.join(' ')}
          </Text>
        </ChamferPanel>
      ))}
    </Inline>
  ),
};

export const Tones: Story = {
  name: 'Тона',
  render: (args) => (
    <Stack gap={3}>
      {(['default', 'accent', 'solid', 'hatch'] as const).map((tone) => (
        <ChamferPanel key={tone} {...args} tone={tone}>
          <Text weight="semibold">{tone}</Text>
        </ChamferPanel>
      ))}
    </Stack>
  ),
};

export const Sizes: Story = {
  name: 'Размеры среза',
  render: (args) => (
    <Inline gap={3}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <ChamferPanel
          key={size}
          {...args}
          size={size}
          corners={['tr', 'bl']}
          style={{ width: 100 }}
        >
          <Text mono size="sm">
            {size}
          </Text>
        </ChamferPanel>
      ))}
    </Inline>
  ),
};

export const InSignal: Story = {
  name: 'В стиле «сигнал»',
  render: (args) => (
    <SignalScope style={{ padding: 16, background: 'var(--bg)' }}>
      <ChamferPanel {...args} tone="accent" corners={['tr', 'bl']} />
    </SignalScope>
  ),
};

export const ClipsByShape: Story = {
  name: 'Форма — clip-path, рамка — кольцо',
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement).getByText('Ночной рейд').closest('[data-corners]');

    await expect(panel).not.toBeNull();
    await expect(getComputedStyle(panel as Element).clipPath).toContain('polygon');
    await expect(getComputedStyle(panel as Element, '::after').clipPath).toContain('evenodd');
  },
};
