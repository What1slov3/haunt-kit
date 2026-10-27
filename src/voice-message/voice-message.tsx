import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { Pause, Play, RotateCw } from 'lucide-react';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import {
  computePeaks,
  formatTime,
  nextRate,
  ratioAt,
  resamplePeaks,
  seekByKey,
} from './voice-math';

import styles from './voice-message.module.css';

export interface VoiceMessageProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Аудио — URL, blob: или data: */
  src: string;
  /** Пики волны от сервера (любая длина, любой масштаб); без них считаются из аудио через Web Audio */
  peaks?: readonly number[];
  /** Длительность в секундах, если известна из метаданных сообщения — видна до загрузки аудио */
  duration?: number;
  /** Столбцов в волне */
  bars?: number;
  /** Подпись группы для скринридера */
  label?: string;
}

/** Одно голосовое за раз: новое ставит на паузу прежнее, как в мессенджерах */
let playing: HTMLAudioElement | null = null;

/** Пики из самого аудио: OfflineAudioContext не требует жеста пользователя и не открывает звуковое устройство */
async function decodePeaks(src: string, bars: number, signal: AbortSignal) {
  const response = await fetch(src, { signal });
  const data = await response.arrayBuffer();
  const buffer = await new OfflineAudioContext(1, 1, 44_100).decodeAudioData(data);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
    buffer.getChannelData(i),
  );

  return { peaks: computePeaks(channels, bars), duration: buffer.duration };
}

function useComputedPeaks(src: string, bars: number, enabled: boolean) {
  const [result, setResult] = useState<{ src: string; peaks: number[]; duration: number } | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    decodePeaks(src, bars, controller.signal).then(
      (decoded) => setResult({ src, ...decoded }),
      () => {
        // Волна — украшение: не расшифровалась — остаются ровные столбцы, плеер работает
      },
    );

    return () => controller.abort();
  }, [src, bars, enabled]);

  return result?.src === src ? result : null;
}

/** Ровные столбцы, пока пиков нет: у ряда уже есть форма и высота */
const FLAT = 0.18;

/**
 * Голосовое сообщение: play / pause, волна из пиков (прогресс — заливкой акцентом), перемотка кликом,
 * перетаскиванием и клавишами (slider: стрелки ±5 с, PageUp / PageDown ±15 с, Home / End), текущее время и
 * длительность моно, скорость ×1 / ×1.5 / ×2, загрузка и ошибка с повтором. Источник — `<audio>`.
 */
export function VoiceMessage({
  src,
  peaks,
  duration: knownDuration,
  bars = 48,
  label,
  className,
  style,
  ...rest
}: VoiceMessageProps) {
  const strings = useUiStrings();
  const text = strings.voiceMessage;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [metaDuration, setMetaDuration] = useState<number | null>(null);
  const [rate, setRate] = useState(1);
  const [scrubbing, setScrubbing] = useState(false);
  const computed = useComputedPeaks(src, bars, !peaks);

  const duration = knownDuration ?? metaDuration ?? computed?.duration ?? 0;
  const values = peaks
    ? resamplePeaks(peaks, bars)
    : (computed?.peaks ?? new Array<number>(bars).fill(FLAT));
  const progress = duration > 0 ? Math.min(time / duration, 1) : 0;

  // Время — каждый кадр во время игры: timeupdate приходит 4 раза в секунду, и заливка шла бы рывками
  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;

      if (audio) setTime(audio.currentTime);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      if (playing === audio) playing = null;
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (failed) {
      setFailed(false);
      audio.load();
    }

    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (playing && playing !== audio) playing.pause();

    playing = audio;
    audio.playbackRate = rate;
    setLoading(audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA);

    try {
      await audio.play();
    } catch (error) {
      // AbortError — play() перебила пауза или новая загрузка; NotAllowedError — браузер не дал звук без
      // жеста. Это не ошибка файла: плеер остаётся на паузе, повторное нажатие сыграет
      const benign =
        error instanceof DOMException &&
        (error.name === 'AbortError' || error.name === 'NotAllowedError');

      if (!benign) setFailed(true);

      setLoading(false);
    }
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;

    setTime(seconds);

    if (audio && Number.isFinite(seconds)) audio.currentTime = seconds;
  };

  const seekToPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    seek(ratioAt(event.clientX, rect.left, rect.width) * duration);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = seekByKey(event.key, time, duration);

    if (next === null || duration <= 0) return;

    event.preventDefault();
    seek(next);
  };

  const changeRate = () => {
    const next = nextRate(rate);

    setRate(next);

    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const bar = (value: number, index: number) => (
    <span
      key={index}
      className={styles.bar}
      style={{ '--peak': Math.max(value, 0.08) } as CSSProperties}
    />
  );

  return (
    <div
      role="group"
      aria-label={label ?? text.label}
      className={cx(styles.root, className)}
      data-state={failed ? 'error' : isPlaying ? 'playing' : 'paused'}
      data-peaks={peaks ? 'provided' : computed ? 'computed' : 'pending'}
      style={style}
      {...rest}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onPlaying={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;

          if (Number.isFinite(value)) setMetaDuration(value);
        }}
        onTimeUpdate={(event) => {
          if (!isPlaying) setTime(event.currentTarget.currentTime);
        }}
        onEnded={(event) => {
          // С конца — на начало: следующее нажатие играет сначала, как в мессенджерах
          event.currentTarget.currentTime = 0;
          setTime(0);
          setPlaying(false);
        }}
        onError={() => {
          setFailed(true);
          setLoading(false);
          setPlaying(false);
        }}
      />

      <IconButton
        label={failed ? text.retry : isPlaying ? text.pause : text.play}
        variant={failed ? 'secondary' : 'accent'}
        shape="circle"
        size="lg"
        loading={loading}
        className={styles.play}
        onClick={toggle}
      >
        <Icon icon={failed ? RotateCw : isPlaying ? Pause : Play} size="sm" />
      </IconButton>

      <div
        role="slider"
        tabIndex={failed ? -1 : 0}
        aria-label={text.seek}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={text.position(formatTime(time), formatTime(duration))}
        aria-disabled={failed || undefined}
        className={styles.wave}
        data-scrubbing={scrubbing || undefined}
        style={{ '--progress': progress } as CSSProperties}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          if (event.button !== 0 || failed || duration <= 0) return;

          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Указатель уже отпущен (NotFoundError) — перемотка одним кликом без перетаскивания
          }

          setScrubbing(true);
          seekToPointer(event);
        }}
        onPointerMove={(event) => {
          if (scrubbing) seekToPointer(event);
        }}
        onPointerUp={() => setScrubbing(false)}
        onPointerCancel={() => setScrubbing(false)}
      >
        <span className={styles.bars} aria-hidden>
          {values.map(bar)}
        </span>

        {/* Заливка — второй ряд тех же столбцов, обрезанный clip-path: scaleX растянул бы столбцы */}
        <span className={cx(styles.bars, styles.played)} aria-hidden>
          {values.map(bar)}
        </span>
      </div>

      {failed ? (
        <span className={styles.error} role="alert">
          {text.loadFailed}
        </span>
      ) : (
        <span className={styles.time}>
          {formatTime(time)}
          <span className={styles.total}> / {formatTime(duration)}</span>
        </span>
      )}

      <button
        type="button"
        className={styles.rate}
        aria-label={text.rate(rate)}
        disabled={failed}
        onClick={changeRate}
      >
        ×{rate}
      </button>
    </div>
  );
}
