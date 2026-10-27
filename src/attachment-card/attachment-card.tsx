import { lazy, Suspense, type ComponentPropsWithRef, type ReactNode } from 'react';

import {
  Check,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  RotateCw,
  X,
  type LucideIcon,
} from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { fileKind, formatBytes, splitFileName, type FileKind } from '../file-dropzone/files';
import type { FilteredImageMode } from '../filtered-image/filtered-image';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { Progress } from '../progress/progress';

import styles from './attachment-card.module.css';

// Фильтр — canvas, декодер кадров и кэш: в чанк вложений он попадает, только когда превью фильтруют
const FilteredImage = lazy(() =>
  import('../filtered-image/filtered-image').then((module) => ({ default: module.FilteredImage })),
);

export interface AttachmentCardProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  name: string;
  /** Байты */
  size?: number;
  /** MIME — по нему (и по расширению) выбирается иконка */
  type?: string;
  /** Миниатюра вместо иконки — для изображений */
  previewUrl?: string;
  /** Миниатюра через `FilteredImage`: `true` — дизеринг, или свой режим (`pixel`, `ascii`) */
  filtered?: boolean | FilteredImageMode;
  /** Подпись состояния «готово» — после 100 % */
  completeLabel?: string;
  /** 0–100 — идёт загрузка; null — загрузка неизвестной длины; не задан — файл загружен */
  progress?: number | null;
  /** Текст ошибки: загрузка не удалась */
  error?: ReactNode;
  /** Кнопка «снять» — убрать вложение или отменить загрузку */
  onRemove?: () => void;
  removeLabel?: string;
  /** Кнопка «повторить» рядом с ошибкой */
  onRetry?: () => void;
}

const kindIcon: Record<FileKind, LucideIcon> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  pdf: FileText,
  code: FileCode,
  text: FileText,
  file: FileIcon,
};

/**
 * Вложение в композере и сообщении: иконка типа или миниатюра, имя с обрезкой посередине (расширение
 * видно всегда), размер моно, полоса загрузки с процентом, ошибка и кнопки «повторить» / «снять».
 */
export function AttachmentCard({
  name,
  size,
  type = '',
  previewUrl,
  filtered,
  completeLabel,
  progress,
  error,
  onRemove,
  removeLabel,
  onRetry,
  className,
  ...rest
}: AttachmentCardProps) {
  const strings = useUiStrings();
  const locale = useUiLocale();
  const { head, tail } = splitFileName(name);
  // 100 % — уже не загрузка: галочка вместо полосы, пока экран не уберёт progress
  const complete = typeof progress === 'number' && progress >= 100 && !error;
  const uploading = progress !== undefined && !error && !complete;
  const state = error ? 'error' : uploading ? 'uploading' : complete ? 'complete' : 'done';
  const preview = previewUrl && <img src={previewUrl} alt="" className={styles.preview} />;

  return (
    <div
      className={cx(styles.root, className)}
      data-state={state}
      aria-busy={uploading || undefined}
      {...rest}
    >
      <span className={styles.thumb} data-kind={fileKind({ name, type })}>
        {previewUrl && filtered ? (
          <Suspense fallback={preview}>
            <FilteredImage
              src={previewUrl}
              alt=""
              mode={filtered === true ? 'dither' : filtered}
              aspectRatio="1"
              reveal="none"
              className={styles.preview}
            />
          </Suspense>
        ) : previewUrl ? (
          preview
        ) : (
          <Icon icon={kindIcon[fileKind({ name, type })]} />
        )}
      </span>

      <span className={styles.body}>
        <span className={styles.line}>
          {/* Имя целиком — для скринридера и подсказки: на экране середина может быть срезана */}
          <VisuallyHidden.Root>{name}</VisuallyHidden.Root>

          <span className={styles.name} title={name} aria-hidden>
            {head && <span className={styles.head}>{head}</span>}

            <span className={styles.tail}>{tail}</span>
          </span>

          {size !== undefined && (
            <span className={styles.size}>
              {formatBytes(size, { locale, strings: strings.fileDropzone })}
            </span>
          )}
        </span>

        {error ? (
          <span className={styles.error} role="alert">
            {error}
          </span>
        ) : complete ? (
          <span className={styles.complete} role="status">
            <Icon icon={Check} size="xs" />
            {completeLabel ?? strings.attachmentCard.complete}
          </span>
        ) : (
          uploading && (
            <span className={styles.progress}>
              <Progress value={progress} size="sm" label={strings.attachmentCard.uploading(name)} />

              {progress !== null && <span className={styles.percent}>{Math.round(progress)}%</span>}
            </span>
          )
        )}
      </span>

      {(onRetry || onRemove) && (
        <span className={styles.actions}>
          {error && onRetry && (
            <IconButton label={strings.attachmentCard.retry} size="xs" onClick={onRetry}>
              <Icon icon={RotateCw} size="xs" />
            </IconButton>
          )}

          {onRemove && (
            <IconButton
              label={
                removeLabel ??
                (uploading
                  ? strings.attachmentCard.cancelUpload
                  : strings.attachmentCard.remove(name))
              }
              size="xs"
              onClick={onRemove}
            >
              <Icon icon={X} size="xs" />
            </IconButton>
          )}
        </span>
      )}
    </div>
  );
}
