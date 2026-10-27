import type { ComponentPropsWithRef, ReactNode } from 'react';

import {
  Headphones,
  HeadphoneOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Signal,
  SignalLow,
  SignalMedium,
  Video,
  VideoOff,
  type LucideIcon,
} from 'lucide-react';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { Toggle } from '../toggle/toggle';
import { Tooltip } from '../tooltip/tooltip';

import { qualityFromPing, type VoiceConnection, type VoiceQuality } from './voice-connection';
import styles from './voice-controls.module.css';

export type { VoiceConnection, VoiceQuality } from './voice-connection';

export interface VoiceControlsProps extends ComponentPropsWithRef<'div'> {
  /** Микрофон выключен */
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  /** Звук выключен — не слышу других (и микрофон тоже молчит) */
  deafened?: boolean;
  onDeafenedChange?: (deafened: boolean) => void;
  /** Демонстрация экрана идёт; без обработчика кнопки нет */
  screenSharing?: boolean;
  onScreenSharingChange?: (sharing: boolean) => void;
  /** Камера включена; без обработчика кнопки нет */
  camera?: boolean;
  onCameraChange?: (camera: boolean) => void;
  /** «Отключиться»; без обработчика кнопки нет */
  onLeave?: () => void;
  /** Уровень микрофона 0–1 — полоски индикатора; приложение обновляет его само */
  level?: number;
  /** Состояние соединения; приходит от приложения */
  connection?: VoiceConnection;
  /** Задержка, мс — подпись и полоски сигнала */
  ping?: number;
  /** Канал в строке состояния: «Голосовая · Haunt» */
  channel?: ReactNode;
  /** panel — строка состояния над кнопками (боковая панель), bar — только кнопки в ряд (сцена звонка) */
  layout?: 'panel' | 'bar';
}

const qualityIcon: Record<VoiceQuality, LucideIcon> = {
  good: Signal,
  fair: SignalMedium,
  poor: SignalLow,
};

const LEVEL_BARS = 4;

interface ControlProps {
  label: string;
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  icon: LucideIcon;
  /** Включённое — тревожный тон: выключенный микрофон и звук */
  alarm?: boolean;
}

function Control({ label, pressed, onChange, icon, alarm }: ControlProps) {
  return (
    <Tooltip content={label}>
      <Toggle
        label={label}
        pressed={pressed}
        onPressedChange={onChange}
        className={cx(styles.control, alarm && styles.alarm)}
      >
        <Icon icon={icon} size="sm" />
      </Toggle>
    </Tooltip>
  );
}

/**
 * Панель голоса: микрофон, звук, демонстрация, камера, выход, индикатор уровня микрофона и состояние
 * соединения с задержкой. Только кнопки и состояния — LiveKit и устройства подключает приложение.
 * Подписи кнопок постоянные, а включённость — `aria-pressed`: «Выключить микрофон, нажата».
 */
export function VoiceControls({
  muted = false,
  onMutedChange,
  deafened = false,
  onDeafenedChange,
  screenSharing = false,
  onScreenSharingChange,
  camera = false,
  onCameraChange,
  onLeave,
  level = 0,
  connection = 'connected',
  ping,
  channel,
  layout = 'panel',
  className,
  ...rest
}: VoiceControlsProps) {
  const text = useUiStrings().voiceControls;
  const silent = muted || deafened;
  const lit = silent ? 0 : Math.round(Math.min(Math.max(level, 0), 1) * LEVEL_BARS);
  const quality = ping === undefined ? 'good' : qualityFromPing(ping);
  const live = connection === 'connected';

  return (
    <div
      role="group"
      aria-label={text.label}
      className={cx(styles.root, styles[layout], className)}
      data-connection={connection}
      data-quality={live ? quality : undefined}
      {...rest}
    >
      {layout === 'panel' && (
        <div className={styles.status}>
          <Icon icon={live ? qualityIcon[quality] : Signal} size="sm" className={styles.signal} />

          <span className={styles.statusText}>
            <span role="status" className={styles.connection}>
              {text.connection[connection]}
              {live && ping !== undefined && <span className={styles.ping}>{text.ping(ping)}</span>}
            </span>

            {channel && <span className={styles.channel}>{channel}</span>}
          </span>
        </div>
      )}

      <div className={styles.buttons}>
        <span className={styles.level} data-silent={silent || undefined} aria-hidden>
          {Array.from({ length: LEVEL_BARS }, (_, index) => (
            <span key={index} className={styles.levelBar} data-lit={index < lit || undefined} />
          ))}
        </span>

        {onMutedChange && (
          <Control
            label={text.mute}
            pressed={muted}
            onChange={onMutedChange}
            icon={muted ? MicOff : Mic}
            alarm
          />
        )}

        {onDeafenedChange && (
          <Control
            label={text.deafen}
            pressed={deafened}
            onChange={onDeafenedChange}
            icon={deafened ? HeadphoneOff : Headphones}
            alarm
          />
        )}

        {onScreenSharingChange && (
          <Control
            label={text.screenShare}
            pressed={screenSharing}
            onChange={onScreenSharingChange}
            icon={MonitorUp}
          />
        )}

        {onCameraChange && (
          <Control
            label={text.camera}
            pressed={camera}
            onChange={onCameraChange}
            icon={camera ? Video : VideoOff}
          />
        )}

        {onLeave && (
          <Tooltip content={text.leave}>
            <IconButton
              label={text.leave}
              variant="danger"
              size="md"
              onClick={onLeave}
              className={styles.leave}
            >
              <Icon icon={PhoneOff} size="sm" />
            </IconButton>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
