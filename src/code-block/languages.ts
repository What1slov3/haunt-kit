/*
 * Языки подсветки и их псевдонимы. Модуль лёгкий и без shiki: CodeBlock по нему решает, подсвечивать ли
 * код, а сам shiki и грамматики грузятся только через import() (shiki-loader.ts). Список намеренно короткий:
 * каждая грамматика — свой чанк (TypeScript — около 180 kB), и общий список shiki дал бы их сотни.
 */

export const highlightLanguages = [
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'json',
  'css',
  'html',
  'bash',
  'rust',
  'sql',
  'yaml',
  'toml',
  'markdown',
  'diff',
  'python',
  'go',
  'dockerfile',
  'ini',
] as const;

export type HighlightLanguage = (typeof highlightLanguages)[number];

const aliases: Record<string, HighlightLanguage> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  sh: 'bash',
  shell: 'bash',
  shellscript: 'bash',
  zsh: 'bash',
  console: 'bash',
  yml: 'yaml',
  md: 'markdown',
  rs: 'rust',
  py: 'python',
  golang: 'go',
  docker: 'dockerfile',
  env: 'ini',
  patch: 'diff',
};

const known = new Set<string>(highlightLanguages);

/** Имя грамматики по подписи языка (`ts`, `TSX`, `sh`) или null — такой язык не подсвечиваем */
export function resolveLanguage(language: string | undefined): HighlightLanguage | null {
  if (!language) return null;

  const name = language.trim().toLowerCase();

  if (known.has(name)) return name as HighlightLanguage;

  return aliases[name] ?? null;
}
