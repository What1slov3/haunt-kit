import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { AccentScope, FilteredImage, Grid, Stack, Text, type FilteredImageProps } from '@haunt/ui';
import { detectWebgl2, FILTER_MODES, resetWebgl2Support, type FxRenderer } from '@haunt/ui/fx';

import { orbitGif } from '../lib/stories/demo-gif';
import { photos, videos } from '../lib/stories/demo-photos';

const meta = {
  title: 'Медиа/FilteredImage',
  component: FilteredImage,
  tags: ['autodocs'],
  args: {
    src: photos.orb.src,
    alt: 'Светящийся шар над горизонтом',
    mode: 'dither',
    reveal: 'original',
    appear: true,
    aspectRatio: '16 / 9',
  },
  argTypes: {
    src: { control: false },
    mode: { control: 'select', options: FILTER_MODES },
    reveal: { control: 'inline-radio', options: ['original', 'finer', 'none'] },
    cell: { control: { type: 'range', min: 1, max: 24, step: 1 } },
  },
  // Ширина рамки — параметром: декоратор meta внешний, и вложенный декоратор истории его не расширил бы
  decorators: [
    (Story, { parameters }) => (
      <div style={{ maxWidth: (parameters.frameWidth as number | undefined) ?? 640 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Изображение в духе Fumadocs: `pixel` — пикселизация, `dither` — упорядоченный дизеринг по матрице Байера на палитре из токенов темы (`--image-dither-1…4`), `ascii` — символы `--font-mono` по яркости. Кадр рисуется на canvas и кэшируется; перерисовка — при смене размера, темы, акцента или режима. Наведите курсор — проступает оригинал. `data-effects="off"` — обычное изображение, `prefers-reduced-motion` — статичный кадр. Для обложек, баннеров пространств, пустых состояний — не для аватаров и того, что надо разглядеть. Как устроено — `packages/ui/src/filtered-image/README.md`.',
      },
    },
  },
} satisfies Meta<typeof FilteredImage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Холст нарисован: фильтр включён, кадр появился */
async function expectPainted(canvasElement: HTMLElement) {
  await waitFor(() => expect(canvasElement.querySelector('[data-painted]')).not.toBeNull(), {
    timeout: 3000,
  });
}

export const Dither: Story = {
  play: async ({ canvasElement }) => {
    await expectPainted(canvasElement);

    const canvas = canvasElement.querySelector('canvas');

    await expect(canvas?.width).toBeGreaterThan(0);
    // Исходник остаётся в разметке: подпись читает скринридер
    await expect(within(canvasElement).getByRole('img', { name: /шар/ })).toBeInTheDocument();
  },
};

export const Pixel: Story = {
  args: { mode: 'pixel' },
};

/** Символы JetBrains Mono по яркости — TUI-акцент кита в форме изображения */
export const Ascii: Story = {
  args: { mode: 'ascii' },
};

/** Под курсором ячейки мельчают вдвое, а не проступает оригинал */
export const RevealFiner: Story = {
  name: 'Под курсором — мельче',
  args: { reveal: 'finer', mode: 'pixel', cell: 12 },
};

export const LargeCells: Story = {
  name: 'Крупная ячейка',
  args: { mode: 'dither', cell: 6, src: photos.ridge.src, alt: 'Горная гряда' },
};

/** data-effects="off" — обычное изображение, canvas не создаётся */
export const EffectsOff: Story = {
  name: 'Эффекты выключены',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('[data-filter]');

    await expect(root).toHaveAttribute('data-filter', 'off');
    await expect(canvasElement.querySelector('canvas')).toBeNull();
    await expect(within(canvasElement).getByRole('img', { name: /шар/ })).toBeVisible();
  },
};

/** Палитра дизеринга — из акцента пространства: внутри AccentScope тот же кадр другого цвета */
export const InAccentScope: Story = {
  name: 'Акцент пространства',
  render: (args) => (
    <Grid columns={2} gap={3}>
      {(['violet', 'teal'] as const).map((accent) => (
        <AccentScope key={accent} accent={accent}>
          <Stack gap={1}>
            <FilteredImage {...args} />

            <Text size="sm" tone="muted" mono>
              {accent}
            </Text>
          </Stack>
        </AccentScope>
      ))}
    </Grid>
  ),
};

/** Три режима рядом на одной картинке */
export const Modes: Story = {
  name: 'Три режима',
  args: { src: photos.ridge.src, alt: 'Горная гряда' },
  parameters: { frameWidth: 960 },
  render: (args) => (
    <Grid columns={3} gap={3}>
      {(['pixel', 'dither', 'ascii'] as const).map((mode) => (
        <Stack key={mode} gap={1}>
          <FilteredImage {...args} mode={mode} aspectRatio="4 / 3" />

          <Text size="sm" tone="muted" mono>
            {mode}
          </Text>
        </Stack>
      ))}
    </Grid>
  ),
};

/** Холст текущего кадра, чтобы сравнить два момента анимации */
function snapshot(canvasElement: HTMLElement): string {
  return canvasElement.querySelector('canvas')?.toDataURL() ?? '';
}

/**
 * GIF фильтруется покадрово: кадры раскладывает ImageDecoder, фильтр считается на лету в
 * переиспользуемый холст. Без ImageDecoder (Safari) — первый кадр, картинка не ломается
 */
export const AnimatedGif: Story = {
  name: 'GIF',
  args: { src: orbitGif(), alt: 'Спутник на орбите планеты', mode: 'dither', cell: 4 },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('[data-media]');

    await expect(root).toHaveAttribute('data-media', 'animated');
    await waitFor(() => expect(root).toHaveAttribute('data-playing'), { timeout: 4000 });

    const first = snapshot(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 400));

    await expect(snapshot(canvasElement)).not.toBe(first);
  },
};

/** Та же гифка во всех трёх режимах — ASCII тоже идёт покадрово */
export const AnimatedModes: Story = {
  name: 'GIF — три режима',
  args: { src: orbitGif(), alt: 'Спутник на орбите планеты' },
  parameters: { frameWidth: 960 },
  render: (args) => (
    <Grid columns={3} gap={3}>
      {(['pixel', 'dither', 'ascii'] as const).map((mode) => (
        <Stack key={mode} gap={1}>
          <FilteredImage {...args} mode={mode} aspectRatio="16 / 9" />

          <Text size="sm" tone="muted" mono>
            {mode}
          </Text>
        </Stack>
      ))}
    </Grid>
  ),
};

/** Видео — фрагмент NASA Perpetual Ocean, лежит рядом с историями (`media/CREDITS.md`) */
function OceanVideo(props: Omit<FilteredImageProps, 'src' | 'alt'>) {
  return <FilteredImage {...props} src={videos.ocean.src} media="video" alt={videos.ocean.alt} />;
}

/**
 * Видео (mp4 / webm) — кадры через requestVideoFrameCallback, не чаще 30 в секунду; вне экрана видео
 * стоит на паузе. Для `blob:` вид источника передаётся явно: `media="video"`
 */
export const Video: Story = {
  name: 'Видео',
  args: { mode: 'pixel', cell: 6 },
  render: (args) => <OceanVideo mode={args.mode} cell={args.cell} reveal={args.reveal} />,
};

/** Подпись под кадром истории — моно, как в остальных галереях */
function Caption({ children }: { children: string }) {
  return (
    <Text size="sm" tone="muted" mono>
      {children}
    </Text>
  );
}

/** Все режимы на одной картинке: 3 базовых и 16 новых (ядра и шейдеры новых грузятся лениво) */
export const AllModes: Story = {
  name: 'Все режимы',
  args: { src: photos.city.src, alt: 'Закат над городом' },
  parameters: { frameWidth: 1200 },
  render: (args) => (
    <Grid columns={4} gap={3}>
      {FILTER_MODES.map((mode) => (
        <Stack key={mode} gap={1}>
          <FilteredImage
            {...args}
            mode={mode}
            reveal={mode === 'rgb-split' ? 'finer' : args.reveal}
            aspectRatio="16 / 9"
          />

          <Caption>{mode}</Caption>
        </Stack>
      ))}
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(
      () =>
        expect(canvasElement.querySelectorAll('[data-painted]')).toHaveLength(FILTER_MODES.length),
      { timeout: 8000 },
    );

    // Каждый кадр знает, каким путём нарисован
    for (const root of canvasElement.querySelectorAll('[data-painted]')) {
      await expect(['webgl', 'canvas']).toContain(root.getAttribute('data-renderer'));
    }
  },
};

/** Настройки растра: точки под 45°, линии, цветной — CMYK на светлой теме и RGB-растры на тёмной */
export const HalftoneOptions: Story = {
  name: 'Растр: точки, линии, цвет',
  args: { src: photos.orb.src, mode: 'halftone' },
  parameters: { frameWidth: 960 },
  render: (args) => (
    <Grid columns={3} gap={3}>
      {(
        [
          ['точки 45°', { shape: 'dot', angle: 45 }],
          ['линии 30°', { shape: 'line', angle: 30 }],
          ['cmyk', { channels: 'cmyk' }],
        ] as const
      ).map(([label, options]) => (
        <Stack key={label} gap={1}>
          <FilteredImage {...args} options={options} cell={7} aspectRatio="4 / 3" />

          <Caption>{label}</Caption>
        </Stack>
      ))}
    </Grid>
  ),
};

/** Дуотон и карта градиента берут цвета из токенов: по умолчанию — краска темы, или свои */
export const ToneColors: Story = {
  name: 'Дуотон и свои цвета',
  args: { src: photos.city.src, alt: 'Закат над городом' },
  parameters: { frameWidth: 960 },
  render: (args) => (
    <Grid columns={3} gap={3}>
      <Stack gap={1}>
        <FilteredImage {...args} mode="duotone" aspectRatio="4 / 3" />

        <Caption>duotone</Caption>
      </Stack>

      <Stack gap={1}>
        <FilteredImage
          {...args}
          mode="duotone"
          options={{ colors: ['--background', '--warning'] }}
          aspectRatio="4 / 3"
        />

        <Caption>colors: --background, --warning</Caption>
      </Stack>

      <Stack gap={1}>
        <FilteredImage {...args} mode="gradient-map" aspectRatio="4 / 3" />

        <Caption>gradient-map</Caption>
      </Stack>
    </Grid>
  ),
};

const GIF_MODES = ['crt', 'halftone', 'thermal', 'edge', 'braille', 'led'] as const;

/** Новые режимы покадрово: GIF идёт через фильтр в общем цикле кадров, шейдером или на CPU */
export const AnimatedNewModes: Story = {
  name: 'GIF — новые режимы',
  args: { src: orbitGif(), alt: 'Спутник на орбите планеты' },
  parameters: { frameWidth: 960 },
  render: (args) => (
    <Grid columns={3} gap={3}>
      {GIF_MODES.map((mode) => (
        <Stack key={mode} gap={1}>
          <FilteredImage {...args} mode={mode} aspectRatio="16 / 9" />

          <Caption>{mode}</Caption>
        </Stack>
      ))}
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(
      () => expect(canvasElement.querySelectorAll('[data-playing]')).toHaveLength(GIF_MODES.length),
      { timeout: 6000 },
    );

    const crt = canvasElement.querySelector<HTMLCanvasElement>('[data-mode="crt"] canvas')!;
    const first = crt.toDataURL();

    await new Promise((resolve) => setTimeout(resolve, 400));

    await expect(crt.toDataURL()).not.toBe(first);
  },
};

const PATHS = ['webgl', 'canvas', 'static'] as const;

/**
 * Три пути рендера рядом: `data-fx-renderer` на контейнере задаёт путь принудительно. webgl — шейдер
 * (в headless Chromium — программный растеризатор: сам по себе эффект его бы не выбрал), canvas — то же
 * ядро на CPU, static — один кадр без линзы, проявления и анимации
 */
export const RenderPaths: Story = {
  name: 'Три пути рендера',
  args: { src: orbitGif(), alt: 'Спутник на орбите планеты', mode: 'crt' },
  parameters: { frameWidth: 960 },
  render: (args) => (
    <Grid columns={3} gap={3}>
      {PATHS.map((path) => (
        <Stack key={path} gap={1} data-fx-renderer={path}>
          <FilteredImage {...args} aspectRatio="16 / 9" />

          <Caption>{path}</Caption>
        </Stack>
      ))}
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    const roots = PATHS.map((path) =>
      canvasElement.querySelector(`[data-fx-renderer="${path}"] [data-filter]`)!,
    );
    // Без WebGL2 вовсе принудительный webgl сползает на canvas
    const webgl = detectWebgl2() === 'none' ? 'canvas' : 'webgl';

    await waitFor(() => expect(roots[0]).toHaveAttribute('data-renderer', webgl), {
      timeout: 6000,
    });
    await waitFor(() => expect(roots[1]).toHaveAttribute('data-renderer', 'canvas'));
    await waitFor(() => expect(roots[2]).toHaveAttribute('data-renderer', 'static'));
    // static — стоп-кадр: GIF не играет
    await expect(roots[2]).not.toHaveAttribute('data-playing');
  },
};

/** Принудительный путь рендера на обёртке истории */
const forceRenderer =
  (path: FxRenderer): Decorator =>
  (Story) => (
    <div data-fx-renderer={path}>
      <Story />
    </div>
  );

/**
 * Браузер без WebGL2: `getContext('webgl2')` подменён на null, проверка поддержки сброшена. Режим с
 * шейдером идёт запасным путём Canvas 2D, даже если WebGL попросили принудительно
 */
export const WithoutWebgl: Story = {
  name: 'Без WebGL — запасной путь',
  args: { mode: 'crt' },
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
  play: async ({ canvasElement }) => {
    await expectPainted(canvasElement);
    await expect(detectWebgl2()).toBe('none');
    await expect(canvasElement.querySelector('[data-filter]')).toHaveAttribute(
      'data-renderer',
      'canvas',
    );
  },
};

/**
 * Потеря контекста в рантайме: история теряет общий WebGL-контекст (WEBGL_lose_context) и через 600 мс
 * возвращает. Кадр уходит на Canvas 2D и возвращается на шейдер — без перезагрузки и пустого холста
 */
export const ContextLoss: Story = {
  name: 'Потеря WebGL-контекста',
  args: { mode: 'thermal' },
  decorators: [forceRenderer('webgl')],
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('[data-filter]')!;

    await expectPainted(canvasElement);

    if (detectWebgl2() === 'none') return;

    await waitFor(() => expect(root).toHaveAttribute('data-renderer', 'webgl'), { timeout: 4000 });

    const { simulateContextLoss } = await import('../fx/webgl/shared-context');

    if (!simulateContextLoss(600)) return;

    await waitFor(() => expect(root).toHaveAttribute('data-renderer', 'canvas'), { timeout: 2000 });
    await waitFor(() => expect(root).toHaveAttribute('data-renderer', 'webgl'), { timeout: 4000 });
  },
};
