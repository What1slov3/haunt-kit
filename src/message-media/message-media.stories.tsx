import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { MessageMedia, type MessageMediaItem } from '@haunt/ui';

import { orbitGif } from '../lib/stories/demo-gif';
import { orbScene } from '../lib/stories/demo-scenes';
import { screen } from '../lib/stories/play-helpers';
import { photos, videos } from '../lib/stories/demo-photos';

const orb: MessageMediaItem = {
  src: photos.orb.src,
  width: photos.orb.width,
  height: photos.orb.height,
  name: 'orb.jpg',
  alt: 'Светящийся шар над горизонтом',
  placeholder: orbScene(32, 18),
};
const ridge: MessageMediaItem = {
  src: photos.ridge.src,
  width: photos.ridge.width,
  height: photos.ridge.height,
  name: 'ridge.jpg',
  alt: photos.ridge.alt,
};
const poster: MessageMediaItem = {
  src: photos.nebula.src,
  width: photos.nebula.width,
  height: photos.nebula.height,
  name: 'nebula.jpg',
  alt: photos.nebula.alt,
  caption: 'Вертикальная картинка вписывается по высоте',
};
const panorama: MessageMediaItem = {
  src: orbScene(1800, 300),
  width: 1800,
  height: 300,
  name: 'panorama.png',
  alt: 'Панорама горизонта',
};
const gif: MessageMediaItem = {
  src: orbitGif(),
  width: 320,
  height: 180,
  name: 'orbit.gif',
  alt: 'Спутник на орбите',
  duration: 4,
};

const many = (count: number): MessageMediaItem[] =>
  Array.from({ length: count }, (_, i) => {
    const base = [orb, ridge, poster][i % 3]!;

    return { ...base, id: `m${i}`, alt: `Снимок ${i + 1}`, name: `shot-${i + 1}.png` };
  });

const meta = {
  title: 'Медиа/MessageMedia',
  component: MessageMedia,
  tags: ['autodocs'],
  args: { items: [orb], onOpen: fn(), onRetry: fn() },
  argTypes: { items: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ width: 520 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Превью вложений в ленте. Одно — в своих пропорциях в пределах `maxWidth` × `maxHeight` (по умолчанию 400 × 300), не больше собственного размера; вытянутое сильнее 3:1 — фрагментом с пометкой. Несколько — мозаика: 2 квадрата, 3 — крупная и две, 4 — 2 × 2, сверх `max` — «+N» на последней. Место занято до загрузки по `width` / `height` с сервера: сначала `placeholder` (размытое превью data-URI или средний цвет), потом проявление; пустой `src` — адреса ещё нет, только заглушка. GIF — стоп-кадр со значком, играет при наведении и фокусе; видео — стоп-кадр, длительность, играет по клику на месте. При `data-effects="off"` и reduced-motion GIF стоит. Спойлер размыт до нажатия (и с клавиатуры). Ошибка — «Повторить». Клик открывает `ImageLightbox` на этом вложении (видео в просмотрщик не попадают). Раскладка — список, подпись кнопки — alt или имя файла. Геометрия — чистые функции `media-layout.ts`.',
      },
    },
  },
} satisfies Meta<typeof MessageMedia>;

export default meta;

type Story = StoryObj<typeof meta>;

const counter = () => screen().getByLabelText(/^Изображение \d+ из \d+$/);
const cell = (button: HTMLElement) => button.closest('li')!;

export const Single: Story = {
  name: 'Одна картинка',
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByRole('list', { name: 'Вложения: 1' });

    // Место занято сразу, по размерам с сервера: 960 × 540 в пределах 400 × 300
    await expect(list.style.width).toBe('min(100%, 400px)');
    await waitFor(() =>
      expect(within(list).getByRole('listitem')).toHaveAttribute('data-state', 'loaded'),
    );
  },
};

export const Tall: Story = {
  name: 'Высокая — по высоте',
  args: { items: [poster] },
  play: async ({ canvasElement }) => {
    // Высота упирается в предел 300 px, ширина — по пропорции картинки
    await expect(within(canvasElement).getByRole('list').style.width).toBe(
      `min(100%, ${Math.round((300 * photos.nebula.width) / photos.nebula.height)}px)`,
    );
  },
};

export const Panorama: Story = {
  name: 'Очень широкая — фрагментом',
  args: { items: [panorama] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('фрагмент')).toBeInTheDocument();
  },
};

export const Two: Story = { name: 'Мозаика: две', args: { items: [orb, ridge] } };

export const Three: Story = {
  name: 'Мозаика: три, просмотр на нужной',
  args: { items: [orb, ridge, poster] },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: ridge.alt }));
    await waitFor(() => expect(counter()).toHaveTextContent('2 / 3'));
    await expect(args.onOpen).toHaveBeenCalledWith(1);
  },
};

export const Four: Story = { name: 'Мозаика: четыре', args: { items: many(4) } };

export const More: Story = {
  name: 'Больше лимита — «+N»',
  args: { items: many(7) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getAllByRole('listitem')).toHaveLength(4);

    const last = canvas.getByRole('button', { name: /Ещё 3 вложения/ });

    await expect(last).toHaveTextContent('+3');
    await userEvent.click(last);
    await waitFor(() => expect(counter()).toHaveTextContent('4 / 7'));
  },
};

export const ManyWithBigLimit: Story = {
  name: 'Лимит 9: ряд из двух и ряды по три',
  args: { items: many(8), max: 9, maxHeight: 420 },
};

export const Gif: Story = {
  name: 'GIF: играет при наведении',
  args: { items: [gif] },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /Спутник на орбите, GIF/ });

    await waitFor(() => expect(cell(button)).toHaveAttribute('data-state', 'loaded'));
    await expect(cell(button).querySelector('canvas')).not.toBeNull();
    await expect(cell(button)).not.toHaveAttribute('data-playing');

    await userEvent.hover(button);
    await waitFor(() => expect(cell(button)).toHaveAttribute('data-playing'));

    await userEvent.unhover(button);
    await waitFor(() => expect(cell(button)).not.toHaveAttribute('data-playing'));
  },
};

export const GifKeyboard: Story = {
  name: 'GIF: играет при фокусе',
  args: { items: [gif] },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /GIF/ });

    await waitFor(() => expect(cell(button)).toHaveAttribute('data-state', 'loaded'));
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await waitFor(() => expect(cell(button)).toHaveAttribute('data-playing'));
  },
};

export const GifEffectsOff: Story = {
  name: 'GIF без эффектов — стоп-кадр',
  args: { items: [gif] },
  decorators: [
    (Story) => (
      <div data-effects="off">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /GIF/ });

    await waitFor(() => expect(cell(button)).toHaveAttribute('data-state', 'loaded'));
    await userEvent.hover(button);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await expect(cell(button)).not.toHaveAttribute('data-playing');
  },
};

export const Spoiler: Story = {
  name: 'Спойлер: раскрытие с клавиатуры',
  args: { items: [{ ...orb, spoiler: true }] },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'Спойлер, нажмите, чтобы показать',
    });

    await expect(cell(button)).toHaveAttribute('data-spoiler');

    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(cell(button)).not.toHaveAttribute('data-spoiler');
    await expect(button).toHaveAccessibleName(orb.alt!);
    await expect(args.onOpen).not.toHaveBeenCalled();

    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(counter()).toHaveTextContent('1 / 1'));
  },
};

export const SpoilerInMosaic: Story = {
  name: 'Спойлер в мозаике',
  args: { items: [orb, { ...ridge, spoiler: true }, poster] },
};

export const Placeholder: Story = {
  name: 'Заглушки до загрузки',
  args: {
    items: [
      { ...orb, id: 'blur', src: '' },
      { ...ridge, id: 'color', src: '', placeholder: '#3b2f55' },
    ],
  },
  play: async ({ canvasElement }) => {
    const items = within(canvasElement).getAllByRole('listitem');

    await expect(items[0]).toHaveAttribute('data-state', 'loading');
    await expect(items[0]!.querySelector('img')).toHaveAttribute('src', orb.placeholder);
  },
};

/** Адрес приходит позже метаданных: место и заглушка — сразу, картинка проявляется на месте */
function LateSource() {
  const [src, setSrc] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSrc(orb.src), 1200);

    return () => clearTimeout(timer);
  }, []);

  return <MessageMedia items={[{ ...orb, id: 'late', src }]} />;
}

export const Reveal: Story = {
  name: 'Проявление по загрузке',
  render: () => <LateSource />,
  play: async ({ canvasElement }) => {
    const item = within(canvasElement).getByRole('listitem');

    await expect(item).toHaveAttribute('data-state', 'loading');
    await waitFor(() => expect(item).toHaveAttribute('data-state', 'loaded'), { timeout: 3000 });
  },
};

export const Broken: Story = {
  name: 'Ошибка с повтором',
  args: {
    items: [{ src: 'data:image/png;base64,AAAA', name: 'broken.png', width: 800, height: 450 }],
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const retry = await canvas.findByRole('button', { name: 'Повторить' });

    await expect(canvas.getByText('Не удалось загрузить')).toBeVisible();
    await userEvent.click(retry);
    await expect(args.onRetry).toHaveBeenCalledWith(0);
    await expect(await canvas.findByRole('button', { name: 'Повторить' })).toBeVisible();
  },
};

/** Видео — восьмисекундный фрагмент NASA Perpetual Ocean (`media/CREDITS.md`) */
function VideoDemo() {
  return (
    <MessageMedia
      items={[
        {
          src: videos.ocean.src,
          kind: 'video',
          type: 'video/webm',
          width: videos.ocean.width,
          height: videos.ocean.height,
          name: 'ocean.webm',
          alt: videos.ocean.alt,
          placeholder: '#0b2a3a',
        },
        orb,
      ]}
    />
  );
}

export const VideoInline: Story = {
  name: 'Видео: играет на месте',
  render: () => <VideoDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await canvas.findByRole(
      'button',
      { name: /Течения океана, Видео/ },
      { timeout: 5000 },
    );

    await userEvent.click(button);
    await waitFor(() => expect(canvasElement.querySelector('video[controls]')).not.toBeNull());
    await expect(screen().queryByRole('dialog')).toBeNull();
  },
};

export const Filtered: Story = {
  name: 'Через FilteredImage',
  args: { items: [orb, ridge], filtered: true },
};

export const Narrow: Story = {
  name: 'Уже предела — по контейнеру',
  args: { items: [orb, ridge, poster] },
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
};
