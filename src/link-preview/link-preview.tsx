import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';

import { cx } from '../lib/cx';
import { Skeleton } from '../skeleton/skeleton';

import { linkDomain } from './link-domain';
import styles from './link-preview.module.css';

export interface LinkPreviewProps extends Omit<ComponentPropsWithRef<'div'>, 'title' | 'color'> {
  url: string;
  title?: ReactNode;
  /** Описание; длинное обрезается до двух строк */
  description?: ReactNode;
  /** Название сайта вместо домена в подписи */
  siteName?: string;
  /** Картинка превью (og:image) */
  image?: string;
  imageAlt?: string;
  /** Где картинка: справа миниатюрой или снизу во всю ширину (крупная обложка) */
  imagePosition?: 'end' | 'bottom';
  /** Цвет сайта (theme-color) для полосы слева — данные страницы, любой CSS-цвет; без него — граница */
  color?: string;
  /** Превью ещё загружается: скелетон той же формы */
  loading?: boolean;
}

/**
 * Превью ссылки под сообщением: полоса цвета сайта слева, домен моно, заголовок-ссылка, описание в две
 * строки, картинка справа или снизу. Пока сервер разбирает страницу — `loading`, скелетон той же высоты,
 * чтобы лента не прыгала, когда превью приедет.
 */
export function LinkPreview({
  url,
  title,
  description,
  siteName,
  image,
  imageAlt = '',
  imagePosition = 'end',
  color,
  loading,
  className,
  style,
  ...rest
}: LinkPreviewProps) {
  const rootStyle = color ? ({ ...style, '--preview-color': color } as CSSProperties) : style;

  return (
    <div
      className={cx(styles.preview, styles[imagePosition], className)}
      style={rootStyle}
      aria-busy={loading || undefined}
      {...rest}
    >
      <div className={styles.body}>
        <span className={styles.domain}>{siteName ?? linkDomain(url)}</span>

        {loading ? (
          <>
            <Skeleton width="70%" height={14} />
            <Skeleton lines={2} height={10} />
          </>
        ) : (
          <>
            <a className={styles.title} href={url} target="_blank" rel="noreferrer">
              {title ?? url}
            </a>

            {description && <p className={styles.description}>{description}</p>}
          </>
        )}
      </div>

      {loading &&
        (imagePosition === 'end' ? (
          <Skeleton width={72} height={72} radius="md" />
        ) : (
          <Skeleton height={160} radius="md" />
        ))}

      {!loading && image && (
        <img className={styles.image} src={image} alt={imageAlt} loading="lazy" decoding="async" />
      )}
    </div>
  );
}
