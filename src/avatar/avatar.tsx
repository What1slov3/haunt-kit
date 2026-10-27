import type { ComponentPropsWithRef } from 'react';

import { Avatar as RadixAvatar } from 'radix-ui';

import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import { hueOf } from './avatar-hue';
import styles from './avatar.module.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface AvatarProps extends ComponentPropsWithRef<'span'> {
  src?: string;
  /** Имя: из него берутся инициалы заглушки и её устойчивый цвет */
  name: string;
  /** 20 / 24 / 32 / 40 / 64 px */
  size?: AvatarSize;
  /** Точка статуса в углу; под ней в аватаре вырезано прозрачное отверстие */
  status?: AvatarStatus;
  /** Квадрат со скруглением — для сообществ, круг — для людей */
  shape?: 'circle' | 'rounded';
  /** Говорит в голосовом канале: бегущее кольцо цвета статуса «в сети» */
  speaking?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

export function Avatar({
  src,
  name,
  size = 'md',
  status,
  shape = 'circle',
  speaking,
  className,
  style,
  ...rest
}: AvatarProps) {
  const strings = useUiStrings();

  return (
    <span
      className={cx(
        styles.wrapper,
        styles[size],
        styles[shape],
        speaking && styles.speaking,
        status && styles['with-status'],
        className,
      )}
      style={{ ...style, ['--avatar-hue' as string]: hueOf(name) }}
      data-beam={speaking || undefined}
      {...rest}
    >
      <RadixAvatar.Root className={styles.root}>
        {src && <RadixAvatar.Image className={styles.image} src={src} alt={name} />}

        {/* delayMs — чтобы инициалы не мигали, пока картинка грузится из кеша */}
        <RadixAvatar.Fallback className={styles.fallback} delayMs={src ? 300 : 0}>
          {initials(name)}
        </RadixAvatar.Fallback>
      </RadixAvatar.Root>

      {status && (
        <span
          className={cx(styles.status, styles[`status-${status}`])}
          role="img"
          aria-label={strings.avatar.status[status]}
        />
      )}
    </span>
  );
}
