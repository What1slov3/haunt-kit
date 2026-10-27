import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ImageLightbox, Inline, type ImageLightboxItem } from '@haunt/ui';

import { expectFocused, expectGone, pressEscape, screen } from '../lib/stories/play-helpers';
import { photos } from '../lib/stories/demo-photos';

const gallery: ImageLightboxItem[] = [
  {
    src: photos.orb.src,
    name: 'orb.png',
    alt: 'Светящийся шар над горизонтом',
    caption: 'Закат над стендом',
  },
  { src: photos.ridge.src, name: 'ridge.png', alt: 'Горная гряда слоями' },
  {
    src: photos.nebula.src,
    name: 'poster.png',
    alt: photos.nebula.alt,
    caption: 'Вертикальная картинка вписывается по высоте; при увеличении видны звёзды',
  },
];

interface GalleryDemoProps {
  images: ImageLightboxItem[];
  defaultOpen?: boolean;
  startIndex?: number;
}

/** Миниатюры в сообщении: клик открывает просмотр с этой картинки */
function GalleryDemo({ images, defaultOpen = false, startIndex = 0 }: GalleryDemoProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [index, setIndex] = useState(startIndex);

  return (
    <>
      <Inline gap={2}>
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            aria-label={`Открыть ${image.name ?? i + 1}`}
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            style={{
              padding: 0,
              border: 'none',
              borderRadius: 8,
              overflow: 'hidden',
              cursor: 'zoom-in',
            }}
          >
            <img
              src={image.src}
              alt=""
              width={120}
              height={80}
              style={{ objectFit: 'cover', display: 'block' }}
            />
          </button>
        ))}
      </Inline>

      <ImageLightbox
        images={images}
        open={open}
        onOpenChange={setOpen}
        index={index}
        onIndexChange={setIndex}
      />
    </>
  );
}

const meta = {
  title: 'Медиа/ImageLightbox',
  component: GalleryDemo,
  subcomponents: { ImageLightbox },
  tags: ['autodocs'],
  args: { images: gallery },
  argTypes: { images: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Просмотр вложений на весь экран: затемнение с размытием (по уровню эффектов), стеклянная шапка со счётчиком `2 / 5` моно, масштабом и ссылками «скачать» / «открыть оригинал». Галерея — стрелки на экране и ← / →. Масштаб — колесом к курсору, кнопками, `+` / `-` / `0`, двойным кликом; при увеличении — панорама перетаскиванием, край картинки не уходит внутрь сцены. Esc сначала сбрасывает масштаб, второй — закрывает. Только transform; геометрия — чистые функции `lightbox-math.ts`.',
      },
      story: { inline: false, height: '520px' },
    },
  },
} satisfies Meta<typeof GalleryDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

const counter = () => screen().getByLabelText(/^Изображение \d+ из \d+$/);
const image = () => screen().getByRole('dialog').querySelector('img')!;

export const Default: Story = {};

export const Gallery: Story = {
  name: 'Листание стрелками, счётчик',
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Открыть ridge.png' }));
    await waitFor(() => expect(counter()).toHaveTextContent('2 / 3'));

    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(counter()).toHaveTextContent('3 / 3'));
    await expect(screen().getByRole('button', { name: 'Следующее' })).toBeDisabled();

    await userEvent.click(screen().getByRole('button', { name: 'Предыдущее' }));
    await waitFor(() => expect(counter()).toHaveTextContent('2 / 3'));
  },
};

export const ZoomAndEscape: Story = {
  name: 'Масштаб: первое Esc сбрасывает, второе закрывает',
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Открыть poster.png' });

    await userEvent.click(trigger);
    await waitFor(() => expect(image()).toHaveAttribute('data-ready'));

    await userEvent.click(screen().getByRole('button', { name: 'Увеличить' }));
    await waitFor(() => expect(image()).toHaveAttribute('data-scale', '1.5'));
    await expect(screen().getByRole('button', { name: 'Сбросить масштаб' })).toHaveTextContent(
      '150%',
    );

    await pressEscape();
    await waitFor(() => expect(image()).toHaveAttribute('data-scale', '1'));
    await expect(screen().getByRole('dialog')).toBeVisible();

    await pressEscape();
    await expectGone(() => screen().queryByRole('dialog'));
    await expectFocused(trigger);
  },
};

export const DoubleClickAndDrag: Story = {
  name: 'Двойной клик и перетаскивание',
  args: { defaultOpen: true, startIndex: 2 },
  play: async () => {
    await waitFor(() => expect(image()).toHaveAttribute('data-ready'));

    const stage = image().parentElement!;

    await userEvent.dblClick(stage);
    await waitFor(() => expect(image()).toHaveAttribute('data-scale', '2.5'));
    await expect(stage).toHaveAttribute('data-zoomed');

    const before = image().style.transform;
    const rect = stage.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Указатель — событиями напрямую: перетаскивание слушает pointerdown / move / up на сцене
    const fire = (type: string, dx: number, dy: number) =>
      stage.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: x + dx,
          clientY: y + dy,
        }),
      );

    fire('pointerdown', 0, 0);
    fire('pointermove', -60, -80);
    fire('pointerup', -60, -80);
    await waitFor(() => expect(image().style.transform).not.toBe(before));
  },
};

export const Single: Story = {
  name: 'Одна картинка с подписью',
  args: { images: [gallery[2]!], defaultOpen: true },
  play: async () => {
    await expect(screen().queryByRole('button', { name: 'Следующее' })).toBeNull();
    await expect(screen().getByRole('dialog')).toHaveAccessibleDescription(/Вертикальная картинка/);
    await expect(screen().getByRole('link', { name: 'Скачать' })).toHaveAttribute(
      'download',
      'poster.png',
    );
  },
};

export const Broken: Story = {
  name: 'Не загрузилась',
  args: { images: [{ src: 'data:image/png;base64,AAAA', name: 'broken.png' }], defaultOpen: true },
  play: async () => {
    await expect(await screen().findByRole('alert')).toHaveTextContent('Не удалось загрузить');
  },
};
