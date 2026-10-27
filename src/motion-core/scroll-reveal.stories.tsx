import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { Heading, ScrollReveal, Stack, Surface, Text, supportsScrollTimeline } from '@haunt/ui';

const sections = ['Каналы', 'Голос', 'Роли', 'Журнал', 'Интеграции', 'Безопасность'];

const meta = {
  title: 'Движение/ScrollReveal',
  component: ScrollReveal,
  tags: ['autodocs'],
  args: { animation: 'rise', range: 'entry 0% entry 100%' },
  argTypes: {
    animation: { control: 'inline-radio', options: ['rise', 'fade', 'scale'] },
    range: { control: 'text' },
  },
  render: (args) => (
    <div
      data-scroller=""
      style={{ height: 360, overflow: 'auto', width: 380, border: '1px solid var(--border)' }}
    >
      <Stack gap={4} style={{ padding: 16 }}>
        <Text tone="muted">Прокрутите вниз ↓</Text>

        {sections.map((title) => (
          <ScrollReveal key={title} {...args}>
            <Surface level={3} p={5} radius="2xl" border style={{ minHeight: 120 }}>
              <Heading level={3}>{title}</Heading>
            </Surface>
          </ScrollReveal>
        ))}
      </Stack>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Появление по прокрутке. Где есть `animation-timeline: view()` (`supportsScrollTimeline()`), анимация привязана к прокрутке на композиторе, без JS на кадр, и идёт в обе стороны; участок — `range` (CSS `animation-range`). Где нет — запасной IntersectionObserver (`useInView`): появляется один раз, переходом. Только opacity, transform и filter. «Эффекты: без» и reduced-motion — сразу на месте.',
      },
    },
  },
} satisfies Meta<typeof ScrollReveal>;

export default meta;

type Story = StoryObj<typeof meta>;

const blocks = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>('[data-scroll]'),
];

export const OnScroll: Story = {
  name: 'Карточки по прокрутке',
  play: async ({ canvasElement }) => {
    const mode = supportsScrollTimeline() ? 'timeline' : 'observe';
    const last = blocks(canvasElement).at(-1)!;

    await expect(last).toHaveAttribute('data-scroll', mode);
    last.scrollIntoView({ block: 'end' });

    // В конце участка — на месте: полностью видна
    await waitFor(() => expect(Number(getComputedStyle(last).opacity)).toBeCloseTo(1, 1));
  },
};

export const Scale: Story = { name: 'Масштаб', args: { animation: 'scale' } };

export const EffectsOff: Story = {
  name: 'Эффекты выключены — сразу на месте',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    for (const block of blocks(canvasElement)) {
      await expect(block).toHaveAttribute('data-scroll', 'static');
      await expect(getComputedStyle(block).opacity).toBe('1');
    }
  },
};
