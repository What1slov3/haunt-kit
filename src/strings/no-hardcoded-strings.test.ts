import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
 * Сторож словаря: видимые и озвучиваемые строки кита живут в `strings/*`, а не в коде компонентов.
 * Признак забытой строки — кириллица в строковом литерале, шаблоне или JSX-тексте. Разбор — через
 * TypeScript: комментарии не попадают в дерево, а регулярка по тексту путала бы их со строками.
 */

const CYRILLIC = /[а-яё]/i;

/*
 * Истории, тесты, сам словарь и документация Storybook пишут по-русски намеренно. Папки `stories/`
 * (lib/stories, fx/stories) — демо-данные для историй, в пакет приложения они не попадают.
 */
const sources = import.meta.glob<string>(
  [
    '../**/*.{ts,tsx}',
    '!../**/*.stories.{ts,tsx}',
    '!../**/*.test.{ts,tsx}',
    '!../strings/**',
    '!../docs/**',
    '!../**/stories/**',
  ],
  { query: '?raw', import: 'default', eager: true },
);

/** Файлы-данные, где кириллица — содержимое, а не подпись. Путь от `src/`; `/` в конце — вся папка */
const EXCEPTIONS: Record<string, string> = {
  'emoji-picker/emoji-data.ts':
    'набор эмодзи: русские названия и ключевые слова для поиска; подписи разделов — запасные, словарь их перекрывает',
  'password-strength/password-score.ts':
    'частые русские пароли и ряды клавиатуры — данные для оценки стойкости',
  'command-palette/command-layout.ts':
    'таблица раскладки ЙЦУКЕН ↔ QWERTY для поиска в неверной раскладке',
  'command-palette/command-filter.ts': 'нормализация «ё» → «е» при поиске',
  'combobox/combobox-filter.ts': 'нормализация «ё» → «е» при поиске',
  'timestamp/timestamp-format.ts':
    'связка «вчера в 12:40» — таблица по локалям у чистой функции, которой словарь недоступен',
  'fx/backgrounds/rain.ts': 'глифы фона «дождь»: буквы — узор, а не текст',
  'fx/backgrounds/background-shaders.ts':
    'GLSL в шаблонных строках: кириллица в комментариях шейдера',
  'fx/shaders/filter-shaders.ts': 'GLSL в шаблонных строках: кириллица в комментариях шейдера',
};

const STRING_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

function isExcepted(path: string, list: Record<string, string>): boolean {
  return Object.keys(list).some((key) => (key.endsWith('/') ? path.startsWith(key) : path === key));
}

/*
 * Сообщения исключений и консоли — для разработчика, пользователь их не видит, а язык комментариев и
 * диагностики в проекте русский. Подъём к предкам останавливается на границе функции: строка в колбэке
 * внутри `throw` уже не сообщение ошибки.
 */
function isDiagnostic(node: ts.Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionLike(current) || ts.isSourceFile(current)) return false;
    if (ts.isThrowStatement(current)) return true;
    if (ts.isNewExpression(current) && /Error$/.test(current.expression.getText())) return true;

    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.expression.getText() === 'console'
    )
      return true;
  }

  return false;
}

function findCyrillic(path: string, text: string): string[] {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const found: string[] = [];

  const visit = (node: ts.Node) => {
    if (STRING_KINDS.has(node.kind) && CYRILLIC.test(node.getText(file)) && !isDiagnostic(node)) {
      const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));

      found.push(`${path}:${line + 1} ${node.getText(file).trim().slice(0, 80)}`);
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  return found;
}

const files = Object.entries(sources).map(
  ([key, text]) => [key.replace(/^\.\.\//, ''), text] as const,
);

describe('строки кита — из словаря', () => {
  it('обход видит исходники кита', () => {
    expect(files.map(([path]) => path)).toContain('button/button.tsx');
  });

  it('в коде компонентов нет кириллицы в строках и JSX-тексте', () => {
    const found = files
      .filter(([path]) => !isExcepted(path, EXCEPTIONS))
      .flatMap(([path, text]) => findCyrillic(path, text));

    expect(found).toEqual([]);
  });

  it('исключения указывают на существующие файлы с кириллицей', () => {
    const stale = Object.keys(EXCEPTIONS).filter((key) => {
      const text = sources[`../${key}`];

      return text === undefined || findCyrillic(key, text).length === 0;
    });

    expect(stale).toEqual([]);
  });

  it('ловит строку, шаблон и JSX-текст, но не комментарий и не ошибку', () => {
    const sample = [
      '// комментарий',
      '/* блок */',
      "const a = 'строка';",
      'const b = `шаблон ${a}`;',
      'const c = <b title="подпись">текст</b>;',
      "throw new Error('для разработчика');",
      "console.warn('тоже');",
    ].join('\n');

    expect(findCyrillic('sample.tsx', sample).map((line) => line.split(' ')[0])).toEqual([
      'sample.tsx:3',
      'sample.tsx:4',
      'sample.tsx:5',
      'sample.tsx:5',
    ]);
  });
});
