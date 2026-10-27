/*
 * Токены для кода — `src/theme/tokens.generated.ts`. Источник правды — CSS (`theme/tokens.css`, `--anim-*` в
 * `theme/animations.css`, `--fx-*` в `theme/effects.css`, ручки стиля «сигнал» в `signal/signal.css`):
 * генератор собирает из него имена и значения по умолчанию, а `theme/tokens.ts` строит поверх типизированное
 * API (`tokens.textMuted`, `setTokens`, `TokenScope`). Новый токен в CSS — и после пересборки он есть в коде.
 *
 * Запуск: `pnpm --filter @haunt/ui build:tokens`. Тест рядом сверяет файл с генератором: токен, добавленный
 * в CSS без пересборки, не пройдёт проверку.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../src/', import.meta.url);

/** Откуда брать токены и какой блок какого файла что значит */
const SOURCES: { file: string; blocks: Record<string, TokenSlot> }[] = [
  {
    file: 'theme/tokens.css',
    blocks: {
      ':root': 'base',
      ":root, [data-theme='dark']": 'dark',
      "[data-theme='light']": 'light',
      // Выведены из других токенов на каждом элементе с темой и на каждом элементе — одно выражение на обе темы
      ':root, [data-theme]': 'base',
      '*, ::before, ::after': 'base',
    },
  },
  { file: 'theme/animations.css', blocks: { ':root': 'base' } },
  { file: 'theme/effects.css', blocks: { ":root, [data-effects='subtle']": 'base' } },
  { file: 'signal/signal.css', blocks: { "[data-style='signal']": 'signal' } },
];

type TokenSlot = 'base' | 'dark' | 'light' | 'signal';

export interface TokenEntry {
  /** Имя свойства CSS: `--text-muted` */
  property: string;
  /** Значения по умолчанию как в CSS; base — без темы, dark / light — по темам, signal — в стиле «сигнал» */
  values: Partial<Record<TokenSlot, string>>;
}

interface Block {
  selector: string;
  body: string;
}

/** Блоки верхнего уровня; содержимое @scope, @media и @supports разворачивается, @keyframes и @property — нет */
function blocks(css: string): Block[] {
  const result: Block[] = [];
  let depth = 0;
  let start = 0;
  let selectorStart = 0;

  for (let i = 0; i < css.length; i++) {
    const char = css[i];

    if (char === '{') {
      if (depth === 0) {
        start = i + 1;
        result.push({ selector: css.slice(selectorStart, i).trim(), body: '' });
      }

      depth++;
    } else if (char === '}') {
      depth--;

      if (depth === 0) {
        const block = result.at(-1)!;

        block.body = css.slice(start, i);
        selectorStart = i + 1;
      }
    } else if (char === ';' && depth === 0) {
      // @import и прочие правила без тела верхнего уровня
      selectorStart = i + 1;
    }
  }

  return result.flatMap((block) => {
    if (/^@(scope|media|supports|layer)\b/.test(block.selector)) return blocks(block.body);

    if (block.selector.startsWith('@')) return [];

    return [block];
  });
}

/** Значение одной строкой: переносы и отступы многострочного color-mix() схлопываются */
const compact = (value: string) =>
  value.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();

/** Объявления custom properties в теле блока, без вложенных правил */
function declarations(body: string): [string, string][] {
  const result: [string, string][] = [];
  let depth = 0;
  let nested = 0;
  let current = '';

  for (const char of body) {
    if (char === '{') nested++;
    else if (char === '}') {
      nested--;
      current = '';
      continue;
    }

    if (nested > 0) continue;

    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (char === ';' && depth === 0) {
      const match = /^\s*(--[\w-]+)\s*:\s*([\s\S]*)$/.exec(current);

      if (match) result.push([match[1]!, compact(match[2]!)]);

      current = '';
    } else {
      current += char;
    }
  }

  return result;
}

const normalizeSelector = (selector: string) =>
  selector.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ');

/**
 * Ключ в коде: kebab → camelCase. Две цифровые части подряд склеиваются через `_`, иначе `--space-1-5` и
 * `--space-15` совпали бы: `space1_5`, `radius2xl`, `accent2`, `zPopover`
 */
export function tokenKey(property: string): string {
  const parts = property.replace(/^--/, '').split('-');

  return parts
    .map((part, index) => {
      if (index === 0) return part;

      const previous = parts[index - 1]!;

      if (/^\d/.test(part) && /\d$/.test(previous)) return `_${part}`;

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

export function collectTokens(read: (file: string) => string): Map<string, TokenEntry> {
  const entries = new Map<string, TokenEntry>();

  for (const { file, blocks: slots } of SOURCES) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');

    for (const block of blocks(css)) {
      const slot = slots[normalizeSelector(block.selector)];

      for (const [property, value] of declarations(block.body)) {
        const key = tokenKey(property);
        const entry = entries.get(key) ?? { property, values: {} };

        if (entry.property !== property) {
          throw new Error(`Ключ ${key} получается у двух токенов: ${entry.property} и ${property}`);
        }

        // Первое объявление побеждает: в tokens.css значения по умолчанию идут раньше переопределений
        if (slot && entry.values[slot] === undefined) entry.values[slot] = value;

        entries.set(key, entry);
      }
    }
  }

  return new Map([...entries].sort(([a], [b]) => a.localeCompare(b)));
}

const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** Текст модуля tokens.generated.ts */
export function buildTokensModule(read: (file: string) => string): string {
  const entries = collectTokens(read);
  const vars = [...entries].map(([key, entry]) => `  ${key}: ${quote(entry.property)},`);
  const defaults = [...entries].map(([key, entry]) => {
    const values = Object.entries(entry.values).map(([slot, value]) => `${slot}: ${quote(value)}`);

    return `  ${key}: { ${values.join(', ')} },`;
  });

  return `/*
 * Сгенерировано scripts/tokens.ts из CSS кита — не править руками: \`pnpm --filter @haunt/ui build:tokens\`.
 * Источник правды — theme/tokens.css, theme/animations.css, theme/effects.css, signal/signal.css.
 */

/** Ключ в коде → имя свойства CSS */
export const TOKEN_VARS = {
${vars.join('\n')}
} as const;

/**
 * Значения по умолчанию как в CSS: base — без темы, dark / light — по темам, signal — в стиле «сигнал».
 * Выражения (\`var()\`, \`color-mix()\`) — строкой, как написаны: вычисленное значение — \`readToken()\`.
 */
export const TOKEN_DEFAULTS: {
  readonly [K in keyof typeof TOKEN_VARS]: Readonly<
    Partial<Record<'base' | 'dark' | 'light' | 'signal', string>>
  >;
} = {
${defaults.join('\n')}
};
`;
}

const readSource = (file: string) => readFileSync(new URL(file, SRC), 'utf8');

export const TOKENS_MODULE_PATH = fileURLToPath(new URL('theme/tokens.generated.ts', SRC));

export const buildCurrentTokensModule = () => buildTokensModule(readSource);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = buildCurrentTokensModule();

  writeFileSync(TOKENS_MODULE_PATH, text);
  console.log(`${TOKENS_MODULE_PATH}: ${collectTokens(readSource).size} токенов`);
}
