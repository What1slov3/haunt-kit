import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';

import { Stack, Sticky, Text } from '@haunt/ui';

const meta = {
  title: 'Раскладка/Sticky',
  component: Sticky,
  tags: ['autodocs'],
  args: { edge: 'top', offset: 0, elevate: true, onStuckChange: fn() },
  argTypes: {
    edge: { control: 'inline-radio', options: ['top', 'bottom'] },
    children: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Прилипает к краю прокрутки — шапка, вкладки, полоса «сохранить». Прилипший (`elevate`, по умолчанию) — на стекле, с кромкой и тенью со стороны, где под ним уезжает содержимое: пока не прилип — сливается со страницей. Состояние — атрибутом `data-stuck` и в `onStuckChange` (сменить шапку на компактную). Прокрутка — у ближайшего предка с `overflow`, в том числе `ScrollArea`.',
      },
    },
  },
  render: (args) => (
    <div
      data-testid="scroller"
      style={{
        height: 260,
        overflowY: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <Stack gap={0}>
        <Text style={{ padding: 'var(--space-4)' }}>Шапка пространства уезжает вверх…</Text>

        <Sticky {...args} style={{ padding: 'var(--space-2) var(--space-4)' }}>
          <Text weight="semibold">Холмы · 48 в сети</Text>
        </Sticky>

        {Array.from({ length: 24 }, (_, index) => (
          <Text key={index} size="sm" tone="muted" style={{ padding: '6px var(--space-4)' }}>
            Сообщение {index + 1}
          </Text>
        ))}
      </Stack>
    </div>
  ),
} satisfies Meta<typeof Sticky>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="scroller"]')!;
    const sticky = scroller.querySelector<HTMLElement>('[data-edge]')!;

    await expect(sticky).not.toHaveAttribute('data-stuck');

    scroller.scrollTop = 200;
    await waitFor(() => expect(sticky).toHaveAttribute('data-stuck'));
    await waitFor(() => expect(args.onStuckChange).toHaveBeenLastCalledWith(true));

    scroller.scrollTop = 0;
    await waitFor(() => expect(sticky).not.toHaveAttribute('data-stuck'));
  },
};
