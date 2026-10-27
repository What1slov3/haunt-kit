import { useRef, useState, type ReactNode } from 'react';

import { Button } from '../button/button';
import { Dialog } from '../dialog/dialog';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import type { Crop } from './crop-math';
import {
  ImageCropper,
  type ImageCropperExportOptions,
  type ImageCropperHandle,
  type ImageCropperProps,
} from './image-cropper';
import styles from './image-cropper.module.css';

export interface ImageCropperDialogProps extends Omit<ImageCropperProps, 'ref' | 'title'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Готовый файл и кадр. Промис держит кнопку «Сохранить» в загрузке; после него окно закрывается */
  onSave: (blob: Blob, crop: Crop) => void | Promise<void>;
  /** Размер и формат файла — как у `exportImage` */
  exportOptions?: ImageCropperExportOptions;
  /** Подписи поверх словаря */
  title?: ReactNode;
  saveLabel?: string;
  cancelLabel?: string;
}

/**
 * `ImageCropper` в диалоге с «Сохранить / Отмена»: загрузка аватара и иконки пространства. Ошибка сохранения
 * (сеть, отказ canvas) оставляет окно открытым — что показать, решает экран в `onSave`.
 */
export function ImageCropperDialog({
  open,
  onOpenChange,
  onSave,
  exportOptions,
  title,
  saveLabel,
  cancelLabel,
  ...cropper
}: ImageCropperDialogProps) {
  const strings = useUiStrings().imageCropper;
  const cropperRef = useRef<ImageCropperHandle>(null);
  const [saving, setSaving] = useState(false);
  // Готовность привязана к картинке: новый src снова ждёт загрузки
  const [loadedSrc, setLoadedSrc] = useState<string | Blob | null>(null);
  const ready = loadedSrc === cropper.src;

  const save = async () => {
    const handle = cropperRef.current;

    if (!handle) return;

    setSaving(true);

    try {
      const crop = handle.getCrop();
      const blob = await handle.exportImage(exportOptions);

      await onSave(blob, crop);
      onOpenChange(false);
    } catch {
      // Окно остаётся открытым: пользователь может повторить; сообщение — забота onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <Dialog.Content size="sm" aria-describedby={undefined}>
        <Dialog.Title>{title ?? strings.dialogTitle}</Dialog.Title>

        <ImageCropper
          {...cropper}
          ref={cropperRef}
          className={cx(styles.dialogCropper, cropper.className)}
          onImageLoad={(natural) => {
            setLoadedSrc(cropper.src);
            cropper.onImageLoad?.(natural);
          }}
          onImageError={() => {
            setLoadedSrc(null);
            cropper.onImageError?.();
          }}
        />

        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="secondary" disabled={saving}>
              {cancelLabel ?? strings.cancel}
            </Button>
          </Dialog.Close>

          <Button variant="primary" loading={saving} disabled={!ready} onClick={save}>
            {saveLabel ?? strings.save}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
