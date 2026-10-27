import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { motion } from 'motion/react';

import { Kbd } from '../kbd/kbd';
import { durations, springs } from '../motion/presets';

import styles from './docs-blocks.module.css';
import { readToken, useRootVersion } from './use-live-tokens';

/*
 * Блоки страницы «Токены»: каждое значение читается из CSS в момент показа, поэтому таблица
 * не расходится с tokens.css и перестраивается вместе с темой и акцентом из тулбара.
 */

function useTokenValue(name: string) {
  const ref = useRef<HTMLElement>(null);
  const version = useRootVersion();
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(readToken(ref.current, name));
  }, [name, version]);

  return { ref, value };
}

/** Живое значение переменной текстом — для вставки прямо в абзац MDX */
export function TokenValue({ name }: { name: string }) {
  const { ref, value } = useTokenValue(name);

  return (
    <code ref={ref} className={styles.value}>
      {value || '…'}
    </code>
  );
}

interface ColorGroup {
  title: string;
  hint?: string;
  tokens: string[];
}

function ColorSwatch({ token }: { token: string }) {
  const { ref, value } = useTokenValue(`--${token}`);
  // Градиент — картинка, а не цвет: background-color его бы не показал
  const background = token.includes('gradient') ? `var(--${token})` : undefined;

  return (
    <div className={styles.swatchCard}>
      <span
        ref={ref}
        className={styles.swatch}
        style={background ? { background } : { backgroundColor: `var(--${token})` }}
      />

      <span className={styles.tokenName}>--{token}</span>

      <span className={styles.tokenValue} title={value}>
        {value}
      </span>
    </div>
  );
}

/** Цвета по смыслу: группа — назначение (фон, текст, акцент…), а не оттенок */
export function ColorTokens({ groups }: { groups: ColorGroup[] }) {
  return (
    <div className={styles.stack}>
      {groups.map((group) => (
        <section key={group.title} className={styles.group}>
          <div className={styles.groupTitle}>{group.title}</div>

          {group.hint && <div className={styles.groupHint}>{group.hint}</div>}

          <div className={styles.swatchGrid}>
            {group.tokens.map((token) => (
              <ColorSwatch key={token} token={token} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

interface ScaleRowProps {
  token: string;
  children: (style: CSSProperties) => ReactNode;
  styleFor: (token: string) => CSSProperties;
}

function ScaleRow({ token, children, styleFor }: ScaleRowProps) {
  const { ref, value } = useTokenValue(`--${token}`);

  return (
    <div className={styles.scaleRow}>
      <span ref={ref} className={styles.tokenName}>
        --{token}
      </span>

      <span className={styles.tokenValue}>{value}</span>

      <div className={styles.scaleDemo}>{children(styleFor(token))}</div>
    </div>
  );
}

const textSizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];

/** Шкала текста: 13 px — интерфейс, 14 px — сообщения */
export function TextScale() {
  return (
    <div className={styles.table}>
      {textSizes.map((size) => (
        <ScaleRow
          key={size}
          token={`text-${size}`}
          styleFor={(token) => ({
            fontSize: `var(--${token})`,
            fontWeight: size.endsWith('xl') ? 600 : 400,
          })}
        >
          {(style) => (
            <span className={styles.sample} style={style}>
              Съешь ещё этих мягких французских булок
            </span>
          )}
        </ScaleRow>
      ))}

      <ScaleRow token="font-sans" styleFor={() => ({ fontFamily: 'var(--font-sans)' })}>
        {(style) => <span style={style}>Inter Variable — интерфейс и сообщения</span>}
      </ScaleRow>

      <ScaleRow token="font-mono" styleFor={() => ({ fontFamily: 'var(--font-mono)' })}>
        {(style) => (
          <span style={style}>
            12:40 · #general · id 7f3a · <Kbd size="sm">Ctrl+K</Kbd>
          </span>
        )}
      </ScaleRow>
    </div>
  );
}

const spaces = ['0-5', '1', '1-5', '2', '3', '4', '5', '6', '8', '10', '12', '16'];

/** Отступы: шаг 4 и полушаги 2 / 6 для плотных строк; в пропсах — числом (`gap={1.5}`) */
export function SpaceScale() {
  return (
    <div className={styles.table}>
      {spaces.map((space) => (
        <ScaleRow
          key={space}
          token={`space-${space}`}
          styleFor={(token) => ({ width: `var(--${token})` })}
        >
          {(style) => <span className={styles.spaceBar} style={style} />}
        </ScaleRow>
      ))}
    </div>
  );
}

const radii = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'];

/** Скругления: md у контролов, lg у панелей и меню, xl у диалогов, full — бейджи, чипы, аватары */
export function RadiusScale() {
  return (
    <div className={styles.table}>
      {radii.map((radius) => (
        <ScaleRow
          key={radius}
          token={`radius-${radius}`}
          styleFor={(token) => ({ borderRadius: `var(--${token})` })}
        >
          {(style) => <span className={styles.radiusBox} style={style} />}
        </ScaleRow>
      ))}
    </div>
  );
}

const heights = ['control-sm', 'control-md', 'control-lg', 'row-compact', 'row-default'];

/** Высоты: кнопка и поле одного размера — одной высоты и кегля */
export function HeightScale() {
  return (
    <div className={styles.table}>
      {heights.map((height) => (
        <ScaleRow key={height} token={height} styleFor={(token) => ({ height: `var(--${token})` })}>
          {(style) => (
            <span className={styles.heightBox} style={style}>
              {height}
            </span>
          )}
        </ScaleRow>
      ))}
    </div>
  );
}

const shadows = ['shadow-soft', 'shadow-float'];

/** Тени — с оттенком фона и капли акцента; в тёмной теме слои различает граница, тень — у плавающего */
export function ShadowScale() {
  return (
    <div className={styles.table}>
      {shadows.map((shadow) => (
        <ScaleRow
          key={shadow}
          token={shadow}
          styleFor={(token) => ({ boxShadow: `var(--${token})` })}
        >
          {(style) => <span className={styles.shadowBox} style={style} />}
        </ScaleRow>
      ))}

      <ScaleRow
        token="edge-highlight"
        styleFor={() => ({ boxShadow: 'inset 0 1px 0 var(--edge-highlight)' })}
      >
        {(style) => <span className={styles.shadowBox} style={style} />}
      </ScaleRow>

      <ScaleRow token="blur-glass" styleFor={() => ({})}>
        {() => <span className={styles.tokenHint}>стекло меню, поповеров, тостов</span>}
      </ScaleRow>

      <ScaleRow token="blur-ambient" styleFor={() => ({})}>
        {() => <span className={styles.tokenHint}>размытие пятен живого фона</span>}
      </ScaleRow>
    </div>
  );
}

const motionTokens = [
  { token: 'duration-fast', hint: 'наведение, нажатие, уход меню' },
  { token: 'duration-base', hint: 'появление меню и поповеров, раскрытие' },
  { token: 'duration-slow', hint: 'диалог, тост, всплеск реакции' },
  { token: 'duration-ambient', hint: 'один цикл дрейфа пятен фона' },
  { token: 'ease-out', hint: 'почти всё: быстрый старт, мягкая остановка' },
  { token: 'ease-in-out', hint: 'пульс, перелив, волна точек' },
  { token: 'press-scale', hint: 'сжатие кнопки при нажатии' },
];

/** CSS-сторона движения: длительности, кривые и сжатие */
export function MotionTokens() {
  return (
    <div className={styles.table}>
      {motionTokens.map(({ token, hint }) => (
        <ScaleRow key={token} token={token} styleFor={() => ({})}>
          {() => <span className={styles.tokenHint}>{hint}</span>}
        </ScaleRow>
      ))}
    </div>
  );
}

/** JS-сторона движения (motion/presets.ts, вход @haunt/ui/motion): пружины Motion; наведите на квадрат — он поедет */
export function SpringDemo() {
  return (
    <div className={styles.table}>
      {(Object.keys(springs) as Array<keyof typeof springs>).map((name) => (
        <div key={name} className={styles.scaleRow}>
          <span className={styles.tokenName}>springs.{name}</span>

          <span className={styles.tokenValue}>
            stiffness {springs[name].stiffness} · damping {springs[name].damping}
          </span>

          <div className={styles.scaleDemo}>
            <motion.span
              className={styles.motionDot}
              whileHover={{ x: 160 }}
              transition={springs[name]}
            />
          </div>
        </div>
      ))}

      <div className={styles.scaleRow}>
        <span className={styles.tokenName}>durations</span>

        <span className={styles.tokenValue}>
          fast {durations.fast} · base {durations.base} · slow {durations.slow} с
        </span>

        <span className={styles.tokenHint}>те же 90 / 150 / 220 мс, что в CSS</span>
      </div>
    </div>
  );
}

const zLayers = [
  'z-background',
  'z-base',
  'z-raised',
  'z-sticky',
  'z-overlay',
  'z-popover',
  'z-toast',
  'z-tooltip',
];

/** Z-слои: фон под всем, подсказка над всем */
export function ZLayers() {
  return (
    <div className={styles.table}>
      {zLayers.map((layer) => (
        <ScaleRow key={layer} token={layer} styleFor={() => ({})}>
          {() => null}
        </ScaleRow>
      ))}
    </div>
  );
}
