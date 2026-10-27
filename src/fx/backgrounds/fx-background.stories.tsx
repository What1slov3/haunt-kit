import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ambient, AmbientBackground, Button, Grid, Inline, Stack, Text } from '@haunt/ui';
import {
  detectWebgl2,
  FX_BACKGROUNDS,
  FxBackground,
  resetWebgl2Support,
  type FxBackgroundVariant,
  type FxRenderer,
} from '@haunt/ui/fx';

import { syntheticVoice } from './waveform';

const meta = {
  title: 'Эффекты/FxBackground',
  component: FxBackground,
  tags: ['autodocs'],
  args: { variant: 'flow', reaction: 'vivid', seed: 7 },
  argTypes: {
    variant: { control: 'select', options: FX_BACKGROUNDS },
    reaction: { control: 'inline-radio', options: ['off', 'quiet', 'vivid'] },
    level: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
  },
  render: (args) => (
    <Frame height={360}>
      <AmbientBackground
        fixed={false}
        variant={args.variant}
        reaction={args.reaction}
        level={args.level}
        seed={args.seed}
      />
    </Frame>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Живые фоны `@haunt/ui/fx`: `flow`, `contour`, `mesh`, `starfield` — шейдер WebGL2 с запасным Canvas 2D; `rain`, `constellation`, `radar`, `waveform`, `hex`, `life` — Canvas 2D. Под экран — `AmbientBackground variant="…"` (так же выбираются в тулбаре «Фон»), в рамке — `FxBackground` или `AmbientBackground fixed={false}`. Реакция на курсор, клики и шину `ambient` (`pulse`, `jump`, `level`) — по `reaction`. Цвета — токены темы и акцента. `data-effects="off"`, reduced-motion и `data-fx-renderer="static"` — неподвижный кадр. `Scanlines` (или проп `scanlines`) — развёртка поверх любого фона.',
      },
    },
  },
} satisfies Meta<typeof FxBackground>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Рамка для фона: свой контекст позиционирования и наложения (`fixed={false}`) */
function Frame({
  children,
  height = 200,
  style,
}: {
  children: ReactNode;
  height?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'relative',
        isolation: 'isolate',
        height,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <Text size="xs" tone="muted" mono>
      {children}
    </Text>
  );
}

/** Все фоны нарисованы: у каждого холста есть кадр */
async function expectPainted(canvasElement: HTMLElement, count: number) {
  await waitFor(
    () =>
      expect(canvasElement.querySelectorAll('[data-background][data-painted]')).toHaveLength(count),
    { timeout: 8000 },
  );
}

/** Сумма альфы холста фона в квадрате вокруг точки — мера «сколько нарисовано» */
function inkAround(canvas: HTMLCanvasElement, x: number, y: number, size: number): number {
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / canvas.getBoundingClientRect().width;

  if (!ctx) return 0;

  const data = ctx.getImageData(
    Math.max(0, Math.round((x - size / 2) * scale)),
    Math.max(0, Math.round((y - size / 2) * scale)),
    Math.round(size * scale),
    Math.round(size * scale),
  ).data;
  let sum = 0;

  for (let i = 3; i < data.length; i += 4) sum += data[i]!;

  return sum;
}

export const Flow: Story = {};

/** Галерея: все фоны рядом и развёртка — одна и поверх дождя */
export const Gallery: Story = {
  name: 'Галерея фонов',
  render: (args) => (
    <Grid columns={3} gap={3}>
      {FX_BACKGROUNDS.map((variant) => (
        <Stack key={variant} gap={1}>
          <Frame>
            <AmbientBackground fixed={false} variant={variant} reaction={args.reaction} />
          </Frame>

          <Caption>{variant}</Caption>
        </Stack>
      ))}

      <Stack gap={1}>
        <Frame>
          <AmbientBackground fixed={false} variant="rain" scanlines reaction={args.reaction} />
        </Frame>

        <Caption>rain + scanlines</Caption>
      </Stack>

      <Stack gap={1}>
        <Frame>
          <AmbientBackground fixed={false} variant="scanlines" />
        </Frame>

        <Caption>scanlines</Caption>
      </Stack>
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    await expectPainted(canvasElement, FX_BACKGROUNDS.length + 1);

    // У фонов с шейдером путь — webgl или canvas, у остальных — только canvas
    for (const variant of ['rain', 'life', 'hex', 'radar'] as const) {
      await expect(canvasElement.querySelector(`[data-background="${variant}"]`)).toHaveAttribute(
        'data-renderer',
        'canvas',
      );
    }
  },
};

const PATHS: FxRenderer[] = ['webgl', 'canvas', 'static'];

/**
 * Три пути рендера рядом: `data-fx-renderer` на рамке задаёт путь принудительно. webgl — шейдер (в
 * headless Chromium — программный растеризатор: сам по себе фон его бы не выбрал), canvas — Canvas 2D,
 * static — один кадр без движения
 */
export const RenderPaths: Story = {
  name: 'Три пути рендера',
  args: { variant: 'contour' },
  render: (args) => (
    <Stack gap={4}>
      {(['contour', 'mesh', 'flow', 'starfield'] as const).map((variant) => (
        <Grid key={variant} columns={3} gap={3}>
          {PATHS.map((path) => (
            <Stack key={path} gap={1} data-fx-renderer={path}>
              <Frame height={170}>
                <AmbientBackground fixed={false} variant={variant} reaction={args.reaction} />
              </Frame>

              <Caption>
                {variant} · {path}
              </Caption>
            </Stack>
          ))}
        </Grid>
      ))}
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    await expectPainted(canvasElement, 12);

    // Без WebGL2 вовсе принудительный webgl сползает на canvas
    const webgl = detectWebgl2() === 'none' ? 'canvas' : 'webgl';

    for (const variant of ['contour', 'mesh', 'flow', 'starfield']) {
      const at = (path: FxRenderer) =>
        canvasElement.querySelector(`[data-fx-renderer="${path}"] [data-background="${variant}"]`)!;

      await waitFor(() => expect(at('webgl')).toHaveAttribute('data-renderer', webgl));
      await expect(at('canvas')).toHaveAttribute('data-renderer', 'canvas');
      await expect(at('static')).toHaveAttribute('data-renderer', 'static');
      // static — неподвижный кадр, без подписки на цикл кадров
      await expect(at('static')).not.toHaveAttribute('data-moving');
    }
  },
};

const forceRenderer =
  (path: FxRenderer): Decorator =>
  (Story) => (
    <div data-fx-renderer={path}>
      <Story />
    </div>
  );

/**
 * Браузер без WebGL2: `getContext('webgl2')` подменён на null, проверка поддержки сброшена. Фоны с
 * шейдером идут по Canvas 2D, даже если WebGL попросили принудительно
 */
export const WithoutWebgl: Story = {
  name: 'Без WebGL — запасной путь',
  beforeEach: () => {
    const original = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      options?: unknown,
    ) {
      return type === 'webgl2' ? null : original.call(this, type as '2d', options as never);
    } as typeof original;
    resetWebgl2Support();

    return () => {
      HTMLCanvasElement.prototype.getContext = original;
      resetWebgl2Support();
    };
  },
  decorators: [forceRenderer('webgl')],
  render: (args) => (
    <Grid columns={2} gap={3}>
      {(['mesh', 'contour', 'flow', 'starfield'] as const).map((variant) => (
        <Stack key={variant} gap={1}>
          <Frame>
            <AmbientBackground fixed={false} variant={variant} reaction={args.reaction} />
          </Frame>

          <Caption>{variant} · без WebGL2</Caption>
        </Stack>
      ))}
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    await expectPainted(canvasElement, 4);
    await expect(detectWebgl2()).toBe('none');

    for (const canvas of canvasElement.querySelectorAll('[data-background]')) {
      await expect(canvas).toHaveAttribute('data-renderer', 'canvas');
    }
  },
};

/** `data-effects="off"` — неподвижный кадр: фон виден, но не движется и не слушает курсор */
export const EffectsOff: Story = {
  name: 'Эффекты выключены — статичный кадр',
  args: { variant: 'hex' },
  decorators: [
    (Story) => (
      <div data-effects="off">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector<HTMLCanvasElement>('[data-background]')!;

    await expectPainted(canvasElement, 1);
    await expect(canvas).not.toHaveAttribute('data-moving');

    const first = canvas.toDataURL();

    await new Promise((resolve) => setTimeout(resolve, 300));

    await expect(canvas.toDataURL()).toBe(first);
  },
};

/** Синтетический «голос» в шину: так приложение передаст уровень говорящего из LiveKit */
function SyntheticVoice() {
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      ambient.level(syntheticVoice((now - start) / 1000));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ambient.level(0);
    };
  }, []);

  return null;
}

/** Осциллограф от уровня в шине: `ambient.level(value)` на каждом кадре анализатора */
export const WaveformVoice: Story = {
  name: 'Осциллограф и голос',
  args: { variant: 'waveform' },
  render: (args) => (
    <Frame height={300}>
      <SyntheticVoice />
      <AmbientBackground
        fixed={false}
        variant={args.variant}
        reaction={args.reaction}
        level={args.level}
        seed={args.seed}
      />
    </Frame>
  ),
};

/** Реакция на шину: волна от кнопки (`ambient.pulseFrom`), прыжок (`ambient.jump`) и уровень голоса */
function BusDemo({ reaction }: { reaction: 'off' | 'quiet' | 'vivid' }) {
  const [level, setLevel] = useState(0);

  return (
    <Stack gap={3}>
      <Inline gap={2}>
        <Button size="sm" onClick={(event) => ambient.pulseFrom(event.currentTarget, 1)}>
          ambient.pulse
        </Button>

        <Button size="sm" onClick={() => ambient.jump(1)}>
          ambient.jump
        </Button>

        <Button size="sm" onClick={() => setLevel((value) => (value > 0 ? 0 : 1))}>
          level: {level}
        </Button>
      </Inline>

      <Grid columns={2} gap={3}>
        {(['hex', 'starfield', 'waveform', 'life'] as const).map((variant: FxBackgroundVariant) => (
          <Stack key={variant} gap={1}>
            <Frame height={220}>
              <AmbientBackground
                fixed={false}
                variant={variant}
                reaction={reaction}
                level={level}
              />
            </Frame>

            <Caption>{variant}</Caption>
          </Stack>
        ))}
      </Grid>
    </Stack>
  );
}

export const BusReaction: Story = {
  name: 'Реакция на шину',
  render: (args) => <BusDemo reaction={args.reaction ?? 'vivid'} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hex = canvasElement.querySelector<HTMLCanvasElement>('[data-background="hex"]')!;
    const stars = canvasElement.querySelector<HTMLCanvasElement>('[data-background="starfield"]')!;

    await expectPainted(canvasElement, 4);

    // Волна в центр гекс-сетки: под фронтом клетки заливаются — альфы вокруг становится больше
    const rect = hex.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const before = inkAround(hex, cx, cy, 140);

    ambient.pulse(rect.left + cx, rect.top + cy, 1);
    await waitFor(() => expect(inkAround(hex, cx, cy, 140)).toBeGreaterThan(before * 1.15), {
      timeout: 1500,
    });

    // Прыжок: звёзды тянутся штрихами — нарисованного по всему полю становится больше
    const starRect = stars.getBoundingClientRect();
    const calm = inkAround(stars, starRect.width / 2, starRect.height / 2, starRect.height);

    await userEvent.click(canvas.getByRole('button', { name: 'ambient.jump' }));
    await waitFor(
      () =>
        expect(
          inkAround(stars, starRect.width / 2, starRect.height / 2, starRect.height),
        ).toBeGreaterThan(calm * 1.3),
      { timeout: 1500 },
    );
  },
};
