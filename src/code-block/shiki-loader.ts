import { createCssVariablesTheme, createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import type { LanguageRegistration, ThemedToken } from 'shiki/core';

import type { HighlightLanguage } from './languages';

/*
 * Подсветка синтаксиса на shiki. Модуль грузится только через import() из use-highlight.ts — ни shiki, ни
 * грамматики не попадают в стартовый чанк приложения. Сборка «по деталям»: ядро + JS-движок регулярных
 * выражений (без WASM Oniguruma — это сотни килобайт и отдельная загрузка) + по грамматике на язык, по
 * требованию.
 */

// Цвета — CSS-переменные --code-*: их задаёт code-block.module.css из токенов темы и акцента, поэтому
// подсветка сама переключается со светлой темой и красится в акцент пространства, без второй темы shiki
const theme = createCssVariablesTheme({
  name: 'haunt',
  variablePrefix: '--code-',
  fontStyle: true,
});

type GrammarModule = { default: LanguageRegistration[] };

// Пути — к отдельным грамматикам: общий bundledLanguages из 'shiki/langs' — это сотни import(), и сборщик
// создал бы чанк на каждый
const grammars: Record<HighlightLanguage, () => Promise<GrammarModule>> = {
  typescript: () => import('shiki/dist/langs/typescript.mjs'),
  tsx: () => import('shiki/dist/langs/tsx.mjs'),
  javascript: () => import('shiki/dist/langs/javascript.mjs'),
  jsx: () => import('shiki/dist/langs/jsx.mjs'),
  json: () => import('shiki/dist/langs/json.mjs'),
  css: () => import('shiki/dist/langs/css.mjs'),
  html: () => import('shiki/dist/langs/html.mjs'),
  bash: () => import('shiki/dist/langs/bash.mjs'),
  rust: () => import('shiki/dist/langs/rust.mjs'),
  sql: () => import('shiki/dist/langs/sql.mjs'),
  yaml: () => import('shiki/dist/langs/yaml.mjs'),
  toml: () => import('shiki/dist/langs/toml.mjs'),
  markdown: () => import('shiki/dist/langs/markdown.mjs'),
  diff: () => import('shiki/dist/langs/diff.mjs'),
  python: () => import('shiki/dist/langs/python.mjs'),
  go: () => import('shiki/dist/langs/go.mjs'),
  dockerfile: () => import('shiki/dist/langs/dockerfile.mjs'),
  ini: () => import('shiki/dist/langs/ini.mjs'),
};

let highlighter: Promise<HighlighterCore> | null = null;
const loading = new Map<HighlightLanguage, Promise<void>>();

function getHighlighter(): Promise<HighlighterCore> {
  // forgiving: редкие конструкции Oniguruma, которые JS-движок не переводит, не ломают весь блок —
  // такой фрагмент просто остаётся без цвета
  highlighter ??= createHighlighterCore({
    themes: [theme],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });

  return highlighter;
}

async function ensureLanguage(core: HighlighterCore, language: HighlightLanguage): Promise<void> {
  if (core.getLoadedLanguages().includes(language)) return;

  let pending = loading.get(language);

  if (!pending) {
    pending = grammars[language]().then((module) => core.loadLanguage(...module.default));
    loading.set(language, pending);
  }

  await pending;
}

/** Токены по строкам. Бросает при сбое загрузки — CodeBlock тогда остаётся без подсветки */
export async function tokenize(
  code: string,
  language: HighlightLanguage,
): Promise<ThemedToken[][]> {
  const core = await getHighlighter();

  await ensureLanguage(core, language);

  return core.codeToTokens(code, { lang: language, theme: 'haunt' }).tokens;
}
