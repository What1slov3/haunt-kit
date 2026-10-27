import { useEffect, useRef, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  Avatar,
  Button,
  ImageCropper,
  ImageCropperDialog,
  Inline,
  Stack,
  Text,
  type Crop,
  type ImageCropperHandle,
} from '@haunt/ui';

import { ridgeScene } from '../lib/stories/demo-scenes';
import { expectGone, screen } from '../lib/stories/play-helpers';
import { photos } from '../lib/stories/demo-photos';

// Горизонтальный кадр: в квадратной маске при scale 1 видна доля высота / ширина — центр не левее её половины
const scene = photos.orb.src;
const HALF_VISIBLE = photos.orb.height / photos.orb.width / 2;
const saved = fn();

const meta = {
  title: 'Медиа/ImageCropper',
  component: ImageCropper,
  tags: ['autodocs'],
  args: { src: scene, onValueChange: fn() },
  argTypes: { src: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Обрезка аватара и иконки пространства. Маска `circle` / `rounded` / `square`, вокруг — затемнённая часть картинки. Сдвиг — перетаскиванием и стрелками (Shift — крупный шаг), масштаб — колесом к курсору, `Slider`, кнопками и `+` / `-`, `0` — сброс. Картинка всегда закрывает маску. Кадр — `{ x, y, scale }` в долях картинки (не в пикселях экрана): `value` / `defaultValue` / `onValueChange`, `ref.getCrop()`; файл — `ref.exportImage({ size, type, quality, clip })` → `Promise<Blob>` через canvas. Картинка — адрес или `File`. Обёртка с «Сохранить / Отмена» — `ImageCropperDialog`.',
      },
    },
  },
} satisfies Meta<typeof ImageCropper>;

export default meta;

type Story = StoryObj<typeof meta>;

async function waitReady(canvasElement: HTMLElement) {
  const stage = within(canvasElement).getByRole('group', { name: 'Обрезка изображения' });

  await waitFor(() => expect(stage).toHaveAttribute('data-ready'));

  return stage;
}

export const Circle: Story = {};

export const Rounded: Story = { name: 'Иконка пространства', args: { mask: 'rounded' } };

export const Square: Story = { args: { mask: 'square', src: ridgeScene(720, 960) } };

export const Banner: Story = {
  name: 'Соотношение 3 : 1',
  args: { mask: 'square', aspect: 3, size: 360 },
};

export const Small: Story = {
  name: 'Маленькая, без управления',
  args: { size: 160, controls: false },
};

export const StaysCovered: Story = {
  name: 'Картинка всегда закрывает маску',
  play: async ({ args, canvasElement }) => {
    const stage = await waitReady(canvasElement);
    const image = stage.querySelector('img')!;
    const mask = stage.querySelector('div[aria-hidden]')!;
    const box = stage.getBoundingClientRect();
    const center = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };

    // Тянем далеко вправо: картинка упирается левым краем в край маски
    fireEvent.pointerDown(stage, { ...center, button: 0, pointerId: 1 });
    fireEvent.pointerMove(stage, { clientX: center.clientX + 1000, clientY: center.clientY });
    fireEvent.pointerUp(stage, { pointerId: 1 });

    const last = () => (args.onValueChange as ReturnType<typeof fn>).mock.lastCall?.[0] as Crop;

    await waitFor(() => expect(last().x).toBeCloseTo(HALF_VISIBLE));

    const imageRect = image.getBoundingClientRect();
    const maskRect = mask.getBoundingClientRect();

    await expect(imageRect.left).toBeLessThanOrEqual(maskRect.left + 0.5);
    await expect(imageRect.right).toBeGreaterThanOrEqual(maskRect.right - 0.5);
    await expect(imageRect.top).toBeLessThanOrEqual(maskRect.top + 0.5);
    await expect(imageRect.bottom).toBeGreaterThanOrEqual(maskRect.bottom - 0.5);

    // Меньше покрытия не уменьшить: кнопка выключена, «−» ничего не меняет
    await expect(within(canvasElement).getByRole('button', { name: 'Уменьшить' })).toBeDisabled();

    stage.focus();
    await userEvent.keyboard('-');

    await expect(last().scale).toBe(1);
  },
};

export const Keyboard: Story = {
  name: 'Клавиатура: стрелки и масштаб',
  play: async ({ args, canvasElement }) => {
    const stage = await waitReady(canvasElement);
    const spy = args.onValueChange as ReturnType<typeof fn>;
    const slider = within(canvasElement).getByRole('slider', { name: 'Масштаб' });

    await userEvent.tab();
    await expect(stage).toHaveFocus();

    await userEvent.keyboard('+');
    await expect(spy).toHaveBeenLastCalledWith({ x: 0.5, y: 0.5, scale: 1.25 });
    await expect(slider).toHaveAttribute('aria-valuenow', '1.25');

    // Картинка едет влево — центр кадра правее
    await userEvent.keyboard('{ArrowLeft}');
    await expect((spy.mock.lastCall?.[0] as Crop).x).toBeGreaterThan(0.5);

    await userEvent.keyboard('0');
    await expect(spy).toHaveBeenLastCalledWith({ x: 0.5, y: 0.5, scale: 1 });
  },
};

function ExportDemo() {
  const cropper = useRef<ImageCropperHandle>(null);
  const [result, setResult] = useState<{ url: string; text: string } | null>(null);

  const run = async () => {
    const blob = await cropper.current!.exportImage({
      size: 128,
      type: 'image/png',
      clip: 'circle',
    });
    const bitmap = await createImageBitmap(blob);

    setResult({
      url: URL.createObjectURL(blob),
      text: `${bitmap.width} × ${bitmap.height} · ${blob.type}`,
    });
  };

  return (
    <Inline gap={6} align="start">
      <ImageCropper ref={cropper} src={scene} defaultValue={{ x: 0.6, y: 0.45, scale: 2 }} />

      <Stack gap={2}>
        <Button variant="primary" onClick={run}>
          Экспорт 128 px
        </Button>

        {result && (
          <>
            <img src={result.url} width={64} height={64} alt="Результат" />
            <Text size="sm" mono>
              {result.text}
            </Text>
          </>
        )}
      </Stack>
    </Inline>
  );
}

export const Export: Story = {
  name: 'Экспорт в Blob нужного размера',
  render: () => <ExportDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitReady(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Экспорт 128 px' }));

    await waitFor(() => expect(canvas.getByText('128 × 128 · image/png')).toBeInTheDocument());
  },
};

function FileDemo() {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Файл «с диска» собирается из сцены: data-URI читается без сети
    void fetch(photos.ridge.src)
      .then((response) => response.blob())
      .then((blob) => {
        if (!cancelled) setFile(new File([blob], 'avatar.png', { type: blob.type }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return file ? <ImageCropper src={file} mask="circle" /> : null;
}

export const FromFile: Story = {
  name: 'Из File',
  render: () => <FileDemo />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('img')).not.toBeNull());

    const stage = await waitReady(canvasElement);

    await expect(stage.querySelector('img')!.src).toMatch(/^blob:/);
  },
};

export const LoadFailed: Story = {
  name: 'Не загрузилась',
  args: { src: 'data:image/png;base64,AAAA' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() =>
      expect(canvas.getByRole('alert')).toHaveTextContent('Не удалось загрузить изображение'),
    );
    await expect(canvas.getByRole('slider')).toHaveAttribute('data-disabled');
  },
};

function DialogDemo({ onSave }: { onSave: (blob: Blob, crop: Crop) => void }) {
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>();

  return (
    <Inline gap={3}>
      <Avatar name="Ада Лавлейс" src={avatar} size="xl" />

      <Button onClick={() => setOpen(true)}>Сменить аватар</Button>

      <ImageCropperDialog
        open={open}
        onOpenChange={setOpen}
        src={scene}
        exportOptions={{ size: 256, type: 'image/webp', quality: 0.9 }}
        onSave={(blob, crop) => {
          setAvatar(URL.createObjectURL(blob));
          onSave(blob, crop);
        }}
      />
    </Inline>
  );
}

export const InDialog: Story = {
  name: 'ImageCropperDialog',
  render: () => <DialogDemo onSave={saved} />,
  play: async ({ canvasElement }) => {
    saved.mockClear();
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Сменить аватар' }));

    const dialog = await screen().findByRole('dialog', { name: 'Обрезка изображения' });
    const save = within(dialog).getByRole('button', { name: 'Сохранить' });

    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    await expect(saved.mock.lastCall?.[0]).toBeInstanceOf(Blob);
    await expectGone(() => screen().queryByRole('dialog'));
  },
};
