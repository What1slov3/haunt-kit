import { useRef } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import {
  Button,
  Stack,
  Text,
  spring,
  springKeyframes,
  springPresets,
  type SpringOptions,
} from '@haunt/ui';

const lanes: { label: string; options: SpringOptions }[] = [
  { label: 'snappy', options: springPresets.snappy },
  { label: 'gentle', options: springPresets.gentle },
  { label: 'k 300, c 10 — перелёт', options: { stiffness: 300, damping: 10 } },
];

/** Демо `spring()`: три шайбы едут одной и той же дорожкой с разными пружинами */
function SpringDemo({ distance = 220 }: { distance?: number }) {
  const pucks = useRef<(HTMLSpanElement | null)[]>([]);
  const forward = useRef(true);

  const play = () => {
    const [from, to] = forward.current ? [0, distance] : [distance, 0];

    forward.current = !forward.current;
    lanes.forEach((lane, index) => {
      const curve = spring(lane.options);

      pucks.current[index]?.animate(
        springKeyframes(curve, (p) => ({ transform: `translateX(${from + (to - from) * p}px)` })),
        { duration: curve.duration, easing: 'linear', fill: 'forwards' },
      );
    });
  };

  return (
    <Stack gap={3} align="start">
      <Button size="sm" onClick={play}>
        Запустить
      </Button>

      {lanes.map((lane, index) => {
        const curve = spring(lane.options);

        return (
          <Stack key={lane.label} gap={1}>
            <Text size="sm" tone="muted" mono>
              {lane.label} · {curve.duration} мс · пик {Math.max(...curve.keyframes).toFixed(3)}
            </Text>

            <span
              style={{
                position: 'relative',
                display: 'block',
                width: distance + 16,
                height: 16,
                borderRadius: 'var(--radius-full)',
                background: 'var(--surface-2)',
              }}
            >
              <span
                ref={(element) => {
                  pucks.current[index] = element;
                }}
                data-lane={lane.label}
                style={{
                  position: 'absolute',
                  width: 16,
                  height: 16,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--accent)',
                }}
              />
            </span>
          </Stack>
        );
      })}
    </Stack>
  );
}

const meta = {
  title: 'Движение/spring',
  component: SpringDemo,
  tags: ['autodocs'],
  args: { distance: 220 },
  parameters: {
    docs: {
      description: {
        component:
          '`spring({ stiffness, damping, mass, velocity })` → `{ keyframes, duration, easing }`: пружина для Web Animations API без библиотеки. Физика решена формулой, `keyframes` — прогресс 0 → 1 по кадрам 60 Гц до покоя, `easing` — та же кривая как CSS `linear()` (`springEasing` — с запасной cubic-bezier, где `linear()` нет). `springKeyframes(curve, p => keyframe)` — кадры WAAPI. Пресеты `springPresets.snappy` / `gentle` — те же числа, что у Motion в `@haunt/ui/motion`: передемпфированы, без «резины».',
      },
    },
  },
} satisfies Meta<typeof SpringDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Presets: Story = {
  name: 'Пресеты и перелёт',
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Запустить' }));

    const puck = canvasElement.querySelector('[data-lane="snappy"]') as HTMLElement;
    const [animation] = puck.getAnimations();

    await expect(animation).toBeDefined();
    await animation!.finished;
    // Пружина пришла ровно в цель и осталась там
    await expect(getComputedStyle(puck).transform).toBe('matrix(1, 0, 0, 1, 220, 0)');
  },
};
