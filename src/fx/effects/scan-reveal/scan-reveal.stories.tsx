import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Button, Heading, Stack, Surface, Text } from '@haunt/ui';
import { ScanReveal } from '@haunt/ui/fx';

const meta = {
  title: 'Эффекты/ScanReveal',
  component: ScanReveal,
  tags: ['autodocs'],
  args: { trigger: 'mount', duration: 700, line: true },
  argTypes: {
    trigger: { control: 'inline-radio', options: ['view', 'mount'] },
    duration: { control: { type: 'range', min: 200, max: 2500, step: 100 } },
  },
  render: (args) => (
    <ScanReveal {...args} style={{ width: 320 }}>
      <Surface level={3} p={5} radius="2xl" border>
        <Stack gap={1}>
          <Heading level={3}>Канал «эфир»</Heading>
          <Text size="sm" tone="muted">
            12 участников · идёт трансляция
          </Text>
        </Stack>
      </Surface>
    </ScanReveal>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Появление строкой развёртки сверху вниз из `@haunt/ui/fx`: элемент открывается за светящейся строкой (цвет акцента, сила `--fx-glow`), как кадр на ЭЛТ. По умолчанию ждёт появления в окне. Обрезка — `clip-path` (исключение обосновано в CSS: шторка цвета фона сломалась бы на стекле). Содержимое доступно скринридеру всё время. «Эффекты: без» и reduced-motion — сразу на месте.',
      },
    },
  },
} satisfies Meta<typeof ScanReveal>;

export default meta;

type Story = StoryObj<typeof meta>;

const root = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[data-scan]') as HTMLElement;

export const Default: Story = {
  name: 'Развёртка',
  render: function ReplayStory(args) {
    const [run, setRun] = useState(0);

    return (
      <Stack gap={3} align="start">
        <Button size="sm" onClick={() => setRun((current) => current + 1)}>
          Повторить
        </Button>

        <ScanReveal key={run} {...args} style={{ width: 320 }}>
          <Surface level={3} p={5} radius="2xl" border>
            <Stack gap={1}>
              <Heading level={3}>Канал «эфир»</Heading>
              <Text size="sm" tone="muted">
                12 участников · идёт трансляция
              </Text>
            </Stack>
          </Surface>
        </ScanReveal>
      </Stack>
    );
  },
  play: async ({ canvasElement }) => {
    await expect(root(canvasElement)).toHaveAttribute('data-scan', 'revealing');
    // Скринридер видит содержимое и во время развёртки
    await expect(
      within(canvasElement).getByRole('heading', { name: 'Канал «эфир»' }),
    ).toBeInTheDocument();
  },
};

export const OnScroll: Story = {
  name: 'При прокрутке',
  args: { trigger: 'view', duration: 1000 },
  render: (args) => (
    <div style={{ height: 260, overflow: 'auto', border: '1px solid var(--border)', padding: 16 }}>
      <div style={{ height: 320, color: 'var(--text-muted)' }}>Прокрутите вниз ↓</div>

      <ScanReveal {...args}>
        <Surface level={3} p={5} radius="2xl" border>
          <Text>Появился строкой развёртки</Text>
        </Surface>
      </ScanReveal>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(root(canvasElement)).toHaveAttribute('data-scan', 'waiting');
    root(canvasElement).scrollIntoView();
    await waitFor(() => expect(root(canvasElement)).toHaveAttribute('data-scan', 'revealing'));
  },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — сразу на месте',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    await expect(root(canvasElement)).toHaveAttribute('data-scan', 'static');
    await expect(getComputedStyle(root(canvasElement).firstElementChild!).clipPath).toBe('none');
  },
};
