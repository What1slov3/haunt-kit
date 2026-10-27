import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button, Heading, Stack, Surface, Text } from '@haunt/ui';
import { PixelDissolve, type PixelDissolveProps } from '@haunt/ui/fx';

function Toggle(props: Omit<PixelDissolveProps, 'visible'>) {
  const [visible, setVisible] = useState(true);

  return (
    <Stack gap={3} align="start">
      <Button size="sm" onClick={() => setVisible((current) => !current)}>
        {visible ? 'Растворить' : 'Проявить'}
      </Button>

      <PixelDissolve {...props} visible={visible} style={{ width: 300 }}>
        <Surface level={3} p={5} radius="2xl" border>
          <Stack gap={1}>
            <Heading level={3}>Сигнал принят</Heading>
            <Text size="sm" tone="muted">
              Элемент растворяется клетками по Байеру
            </Text>
          </Stack>
        </Surface>
      </PixelDissolve>
    </Stack>
  );
}

const meta = {
  title: 'Эффекты/PixelDissolve',
  component: PixelDissolve,
  tags: ['autodocs'],
  args: { visible: true, duration: 420, cell: 6, order: 4, appear: true },
  argTypes: {
    order: { control: 'inline-radio', options: [2, 4, 8] },
    cell: { control: { type: 'range', min: 2, max: 16, step: 1 } },
    duration: { control: { type: 'range', min: 150, max: 2000, step: 50 } },
  },
  render: ({ visible: _visible, ...args }) => <Toggle {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'Появление и растворение пикселями по Байеру из `@haunt/ui/fx`. Маска — повторяющаяся SVG-плитка `order × order` клеток, кадр меняет её только на новой ступени (16 или 64 за переход) — исключение из «только transform», обосновано в CSS. Растворённый элемент остаётся в раскладке с `visibility: hidden` (вне дерева доступности и фокуса); размонтировать — по `onComplete` или через `Presence`. «Эффекты: без» и reduced-motion — смена мгновенная.',
      },
    },
  },
} satisfies Meta<typeof PixelDissolve>;

export default meta;

type Story = StoryObj<typeof meta>;

const root = (canvasElement: HTMLElement) =>
  within(canvasElement)
    .getByText('Сигнал принят')
    .closest('[style*="--dissolve-tile"]') as HTMLElement;

export const Dissolve: Story = {
  name: 'Растворение и проявление',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(root(canvasElement)).not.toHaveAttribute('data-dissolving'));
    await userEvent.click(canvas.getByRole('button', { name: 'Растворить' }));
    await waitFor(() => expect(root(canvasElement)).toHaveAttribute('data-dissolving'));
    await waitFor(() => expect(root(canvasElement)).toHaveAttribute('data-hidden'), {
      timeout: 2000,
    });
    await expect(canvas.queryByRole('heading', { name: 'Сигнал принят' })).toBeNull();

    await userEvent.click(canvas.getByRole('button', { name: 'Проявить' }));
    await waitFor(() => expect(root(canvasElement)).not.toHaveAttribute('data-dissolving'), {
      timeout: 2000,
    });
    await expect(canvas.getByRole('heading', { name: 'Сигнал принят' })).toBeVisible();
  },
};

export const Fine: Story = {
  name: 'Мелкая клетка, 64 ступени',
  args: { cell: 3, order: 8, duration: 900 },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — мгновенно',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Растворить' }));
    await expect(root(canvasElement)).toHaveAttribute('data-hidden');
    await expect(root(canvasElement)).not.toHaveAttribute('data-dissolving');
  },
};
