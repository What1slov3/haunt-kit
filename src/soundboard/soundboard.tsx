import {
  useRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { Square, Volume2 } from 'lucide-react';

import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { Slider } from '../slider/slider';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './soundboard.module.css';

export interface SoundboardSound {
  id: string;
  label: string;
  /** Эмодзи на кнопке */
  emoji?: string;
  /** Иконка вместо эмодзи */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SoundboardProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'onPlay' | 'onVolumeChange'
> {
  sounds: readonly SoundboardSound[];
  /** Какие звуки играют сейчас — id */
  playing?: readonly string[];
  /** Нажали на звук, который не играет */
  onPlay?: (id: string) => void;
  /** Нажали на играющий; без обработчика повторное нажатие запускает звук снова */
  onStop?: (id: string) => void;
  /** «Остановить все» — кнопка видна, пока что-то играет */
  onStopAll?: () => void;
  /** Громкость 0–100 — ползунок в шапке; без обработчика ползунка нет */
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  /** Ширина кнопки, от которой считаются колонки сетки */
  minItemWidth?: number;
  /** Подпись для скринридера; по умолчанию «Звуковая панель» */
  label?: string;
}

/**
 * Звуковая панель: сетка кнопок (эмодзи или иконка, подпись), играющая — нажата (`aria-pressed`), с
 * эквалайзером; громкость — ползунок в шапке. Стрелки ходят по сетке во все стороны, Home / End — к краям.
 * Звук играет приложение (`@haunt/ui/sound` или свои файлы) — панель только показывает и сообщает.
 */
export function Soundboard({
  sounds,
  playing = [],
  onPlay,
  onStop,
  onStopAll,
  volume,
  onVolumeChange,
  minItemWidth = 96,
  label,
  className,
  style,
  ...rest
}: SoundboardProps) {
  const text = useUiStrings().soundboard;
  const gridRef = useRef<HTMLDivElement>(null);
  const active = new Set(playing);

  /*
   * Колонок столько, сколько влезло (auto-fill): число узнаём по раскладке — кнопки с тем же верхом,
   * что у первой, и есть первый ряд.
   */
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      gridRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    );
    const index = buttons.indexOf(event.target as HTMLButtonElement);

    if (index < 0) return;

    const top = buttons[0]?.offsetTop ?? 0;
    const columns = Math.max(1, buttons.filter((button) => button.offsetTop === top).length);
    const last = buttons.length - 1;
    const steps: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index + columns,
      ArrowUp: index - columns,
      Home: 0,
      End: last,
    };
    const next = steps[event.key];

    if (next === undefined) return;

    event.preventDefault();
    buttons[Math.min(Math.max(next, 0), last)]?.focus();
  };

  const press = (id: string) => {
    if (active.has(id) && onStop) onStop(id);
    else onPlay?.(id);
  };

  return (
    <div
      role="group"
      aria-label={label ?? text.label}
      className={cx(styles.root, className)}
      style={{ ...style, '--item-min': `${minItemWidth}px` } as CSSProperties}
      {...rest}
    >
      {(onVolumeChange || onStopAll) && (
        <div className={styles.head}>
          {onVolumeChange && (
            <span className={styles.volume}>
              <Icon icon={Volume2} size="sm" className={styles.volumeIcon} />

              <Slider
                label={text.volume}
                min={0}
                max={100}
                step={1}
                value={[volume ?? 100]}
                onValueChange={([value]) => onVolumeChange(value ?? 0)}
                className={styles.slider}
              />
            </span>
          )}

          {onStopAll && active.size > 0 && (
            <Button
              size="sm"
              variant="ghost"
              iconStart={<Icon icon={Square} size="xs" />}
              onClick={onStopAll}
            >
              {text.stopAll}
            </Button>
          )}
        </div>
      )}

      {sounds.length === 0 ? (
        <p className={styles.empty}>{text.empty}</p>
      ) : (
        <div ref={gridRef} className={styles.grid} onKeyDown={move}>
          {sounds.map((sound) => {
            const isPlaying = active.has(sound.id);

            return (
              <button
                key={sound.id}
                type="button"
                className={styles.sound}
                aria-pressed={isPlaying}
                disabled={sound.disabled}
                onClick={() => press(sound.id)}
              >
                <span className={styles.glyph} aria-hidden>
                  {sound.icon ?? sound.emoji}
                </span>

                <span className={styles.label}>{sound.label}</span>

                {isPlaying && (
                  <span className={styles.playing} aria-hidden>
                    <span className={styles.eq}>
                      <span />
                      <span />
                      <span />
                    </span>

                    <span className={styles.playingText}>{text.playing}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
