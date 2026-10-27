import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';

import { HeadphoneOff, MicOff, Pin } from 'lucide-react';

import { Avatar } from '../avatar/avatar';
import { hueOf } from '../avatar/avatar-hue';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import type { UiStrings } from '../strings/ui-strings-types';

import styles from './media-tile.module.css';

export interface MediaTileProps extends ComponentPropsWithRef<'div'> {
  /** Имя участника: подпись, заглушка-аватар и оттенок фона */
  name: string;
  /** Картинка аватара для заглушки */
  avatarSrc?: string;
  /** Видео или демонстрация экрана — любой узел (`<video>`, трек LiveKit); без него — заглушка */
  video?: ReactNode;
  /** Говорит: бегущий отблеск по краю плитки */
  speaking?: boolean;
  /** Микрофон выключен */
  muted?: boolean;
  /** Звук выключен (не слышит других) */
  deafened?: boolean;
  /** Закреплён в сетке */
  pinned?: boolean;
}

function tileLabel(
  name: string,
  { speaking, muted, deafened, pinned }: Partial<MediaTileProps>,
  text: UiStrings['mediaTile'],
) {
  return [
    name,
    speaking && text.speaking,
    muted && text.muted,
    deafened && text.deafened,
    pinned && text.pinned,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Плитка участника голоса и видео, 16:9. Без видео — крупный аватар на фоне оттенка из имени (как
 * заглушка Avatar). «Говорит» — тот же бегущий отблеск `data-beam`, что у Avatar speaking, по краю
 * плитки и концентрично её скруглению; без эффектов — статичная кромка, говорящего видно всегда.
 * Знает про микрофон и говорящего, но не про LiveKit: трек приходит слотом `video`.
 */
export function MediaTile({
  name,
  avatarSrc,
  video,
  speaking,
  muted,
  deafened,
  pinned,
  className,
  style,
  ...rest
}: MediaTileProps) {
  const strings = useUiStrings();

  return (
    <div
      role="group"
      aria-label={tileLabel(name, { speaking, muted, deafened, pinned }, strings.mediaTile)}
      className={cx(styles.tile, className)}
      style={{ ...style, '--tile-hue': hueOf(name) } as CSSProperties}
      data-beam={speaking || undefined}
      data-speaking={speaking || undefined}
      data-pinned={pinned || undefined}
      data-video={video ? '' : undefined}
      {...rest}
    >
      <div className={styles.media}>
        {video ?? <Avatar name={name} src={avatarSrc} size="xl" className={styles.avatar} />}
      </div>

      <span className={styles.frame} aria-hidden />

      {pinned && (
        <span className={cx(styles.glass, styles.pin)} aria-hidden>
          <Icon icon={Pin} size="xs" />
        </span>
      )}

      <div className={cx(styles.glass, styles.caption)} aria-hidden>
        {muted && <Icon icon={MicOff} size="xs" className={styles.off} />}

        {deafened && <Icon icon={HeadphoneOff} size="xs" className={styles.off} />}

        <span className={styles.name}>{name}</span>
      </div>
    </div>
  );
}
