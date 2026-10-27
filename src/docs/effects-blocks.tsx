import { useEffect, useRef, useState } from 'react';

import { Send } from 'lucide-react';

import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { Chip } from '../chip/chip';
import { FieldFrame } from '../field-frame/field-frame';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { Skeleton } from '../skeleton/skeleton';
import { Surface } from '../surface/surface';
import { Textarea } from '../textarea/textarea';
import type { EffectsLevel } from '../theme/effects';
import { ThemeProvider } from '../theme/theme-provider';
import { TypingDots } from '../typing-dots/typing-dots';

import styles from './docs-blocks.module.css';
import { readToken, useRootVersion } from './use-live-tokens';

const levels: EffectsLevel[] = ['off', 'subtle', 'rich'];

const levelTitle: Record<EffectsLevel, string> = {
  off: 'off — без',
  subtle: 'subtle — тихо (по умолчанию)',
  rich: 'rich — ярко',
};

const fxTokens = [
  { token: '--fx-spotlight', hint: 'прожектор за курсором' },
  { token: '--fx-spotlight-size', hint: 'радиус прожектора' },
  { token: '--fx-glow', hint: 'свечение фона диалога' },
  { token: '--fx-grain', hint: 'зерно панелей' },
  { token: '--fx-shimmer', hint: 'перелив скелетона' },
  { token: '--fx-beam', hint: 'бегущий отблеск по рамке' },
  { token: '--fx-pulse', hint: 'пульс непрочитанного' },
  { token: '--fx-burst', hint: 'всплеск реакции' },
  { token: '--fx-blur', hint: 'размытие под диалогом' },
  { token: '--fx-depth-blur', hint: 'размытие окна «из глубины»' },
  { token: '--fx-play', hint: 'animation-play-state бесконечных анимаций' },
];

/**
 * Интенсивности `--fx-*` для каждого уровня. Значения читаются с трёх скрытых контейнеров с
 * `data-effects` — так же уровень работает на любом элементе, а не только на <html>.
 */
export function EffectsLevelsTable() {
  const probes = useRef<Partial<Record<EffectsLevel, HTMLSpanElement | null>>>({});
  const version = useRootVersion();
  const [values, setValues] = useState<Record<string, Record<EffectsLevel, string>>>({});

  useEffect(() => {
    const next: Record<string, Record<EffectsLevel, string>> = {};

    for (const { token } of fxTokens) {
      next[token] = {
        off: readToken(probes.current.off ?? null, token),
        subtle: readToken(probes.current.subtle ?? null, token),
        rich: readToken(probes.current.rich ?? null, token),
      };
    }

    setValues(next);
  }, [version]);

  return (
    <div className={styles.fxTable}>
      {levels.map((level) => (
        <span
          key={level}
          ref={(element) => {
            probes.current[level] = element;
          }}
          data-effects={level}
          hidden
        />
      ))}

      <div className={styles.fxHead}>переменная</div>
      {levels.map((level) => (
        <div key={level} className={styles.fxHead}>
          {level}
        </div>
      ))}

      {fxTokens.map(({ token, hint }) => (
        <div key={token} className={styles.fxRow}>
          <div>
            <div className={styles.tokenName}>{token}</div>
            <div className={styles.tokenHint}>{hint}</div>
          </div>

          {levels.map((level) => (
            <div key={level} className={styles.tokenValue}>
              {values[token]?.[level] ?? ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LevelColumn({ level }: { level: EffectsLevel }) {
  const [reacted, setReacted] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <div data-effects={level} className={styles.levelColumn}>
      <div className={styles.groupTitle}>{levelTitle[level]}</div>

      <Surface level={2} panel p={3}>
        <div className={styles.tokenHint}>panel: прожектор и зерно — наведите</div>
      </Surface>

      <FieldFrame glow multiline fullWidth className={styles.composer}>
        <Textarea
          bare
          autoGrow
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Фокус — отблеск по рамке"
          aria-label={`Сообщение, эффекты ${level}`}
          className={styles.composerInput}
        />

        <IconButton label="Отправить" size="sm" variant={draft ? 'accent' : 'ghost'}>
          <Icon icon={Send} size="sm" />
        </IconButton>
      </FieldFrame>

      <div className={styles.levelRow}>
        <Button variant="primary" size="sm">
          Кромка
        </Button>

        <Chip
          icon="🔥"
          count={reacted ? 13 : 12}
          selected={reacted}
          onClick={() => setReacted(!reacted)}
          size="sm"
        />

        <Avatar name="Иван Лебедев" size="sm" status="online" speaking />

        <TypingDots size="sm" />
      </div>

      <Skeleton height={10} lines={2} />
    </div>
  );
}

/**
 * Одни и те же примитивы при трёх уровнях рядом. Уровень — атрибут контейнера, поэтому колонки
 * не зависят от тулбара. ThemeProvider нужен ради прожектора: слушатель курсора ставит он.
 */
export function EffectsLevelsDemo() {
  return (
    <ThemeProvider>
      <div className={styles.levels}>
        {levels.map((level) => (
          <LevelColumn key={level} level={level} />
        ))}
      </div>
    </ThemeProvider>
  );
}
