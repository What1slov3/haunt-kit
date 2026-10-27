import { useEffect, useRef, useState } from 'react';

import { useUiStrings } from '../strings/ui-strings-context';
import { Switch } from '../switch/switch';

import { impulseResponse, type RoomShape } from './dsp';
import { MOTIF_ROOM } from './sequence';
import { drawPeaks } from './sound-designer-draw';
import { SliderField } from './sound-designer-fields';
import { ms, seconds } from './sound-designer-units';
import styles from './sound-designer.module.css';
import type { EchoSpec, RoomSpec, SoundSpec } from './sounds';

const DEFAULT_ECHO: EchoSpec = { time: 0.18, feedback: 0.35, tone: 3000, mix: 0.25 };
/** Частота для картинки характеристики: форма спада видна и так, а 4 с хвоста считаются мгновенно */
const PREVIEW_RATE = 4000;

/** Импульсная характеристика помещения: левый канал вверх, правый вниз — видно и спад, и ширину */
function ImpulsePreview({ room, label }: { room: RoomShape; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { decay, preDelay, brightness, width } = room;

  useEffect(() => {
    if (!ref.current) return;

    const [left, right] = impulseResponse({ decay, preDelay, brightness, width }, PREVIEW_RATE);

    drawPeaks(ref.current, left, right);
  }, [decay, preDelay, brightness, width]);

  return <canvas ref={ref} className={styles.impulse} role="img" aria-label={label} />;
}

interface SoundEffectsProps {
  spec: SoundSpec;
  onChange: (patch: Pick<SoundSpec, 'room' | 'echo'>) => void;
}

/** Помещение и эхо звука: выключенное помнит свои значения до следующего включения */
export function SoundEffects({ spec, onChange }: SoundEffectsProps) {
  const strings = useUiStrings().soundDesigner;
  const [lastRoom, setLastRoom] = useState<RoomSpec>(spec.room ?? MOTIF_ROOM);
  const [lastEcho, setLastEcho] = useState<EchoSpec>(spec.echo ?? DEFAULT_ECHO);
  const { room, echo } = spec;
  const fraction = (value: number) => value.toFixed(2);

  const setRoom = (patch: Partial<RoomSpec>) => {
    const next = { ...lastRoom, ...room, ...patch };

    setLastRoom(next);
    onChange({ room: next, echo });
  };

  const setEcho = (patch: Partial<EchoSpec>) => {
    const next = { ...lastEcho, ...echo, ...patch };

    setLastEcho(next);
    onChange({ room, echo: next });
  };

  return (
    <div className={styles.effects}>
      <section className={styles.effect}>
        <Switch
          label={strings.room}
          checked={!!room}
          onCheckedChange={(on) => onChange({ room: on ? lastRoom : undefined, echo })}
        />

        {room && (
          <>
            <ImpulsePreview room={room} label={strings.impulse} />

            <div className={styles.sliders}>
              <SliderField
                label={strings.roomDecay}
                display={`${room.decay.toFixed(2)} ${strings.seconds}`}
                min={0.1}
                max={4}
                step={0.05}
                value={room.decay}
                onChange={(decay) => setRoom({ decay })}
              />

              <SliderField
                label={strings.preDelay}
                display={`${ms(room.preDelay)} ${strings.ms}`}
                min={0}
                max={120}
                step={1}
                value={ms(room.preDelay)}
                onChange={(next) => setRoom({ preDelay: seconds(next) })}
              />

              <SliderField
                label={strings.brightness}
                display={fraction(room.brightness ?? 0.5)}
                min={0}
                max={1}
                step={0.01}
                value={room.brightness ?? 0.5}
                onChange={(brightness) => setRoom({ brightness })}
              />

              <SliderField
                label={strings.width}
                display={fraction(room.width ?? 0.8)}
                min={0}
                max={1}
                step={0.01}
                value={room.width ?? 0.8}
                onChange={(width) => setRoom({ width })}
              />

              <SliderField
                label={strings.mix}
                display={fraction(room.mix)}
                min={0}
                max={1}
                step={0.01}
                value={room.mix}
                onChange={(mix) => setRoom({ mix })}
              />
            </div>
          </>
        )}
      </section>

      <section className={styles.effect}>
        <Switch
          label={strings.echo}
          checked={!!echo}
          onCheckedChange={(on) => onChange({ room, echo: on ? lastEcho : undefined })}
        />

        {echo && (
          <div className={styles.sliders}>
            <SliderField
              label={strings.echoTime}
              display={`${ms(echo.time)} ${strings.ms}`}
              min={40}
              max={600}
              step={5}
              value={ms(echo.time)}
              onChange={(next) => setEcho({ time: seconds(next) })}
            />

            <SliderField
              label={strings.feedback}
              display={fraction(echo.feedback)}
              min={0}
              max={0.85}
              step={0.01}
              value={echo.feedback}
              onChange={(feedback) => setEcho({ feedback })}
            />

            <SliderField
              label={strings.echoTone}
              display={`${Math.round(echo.tone ?? 3500)} ${strings.hz}`}
              min={600}
              max={8000}
              step={50}
              value={echo.tone ?? 3500}
              onChange={(tone) => setEcho({ tone })}
            />

            <SliderField
              label={strings.mix}
              display={fraction(echo.mix)}
              min={0}
              max={1}
              step={0.01}
              value={echo.mix}
              onChange={(mix) => setEcho({ mix })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
