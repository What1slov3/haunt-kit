import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

// Те же грамматики, что в src/code-block/languages.ts (модуль кита сюда не импортируем: конфиг — Node)
const highlightGrammars = [
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
];

/*
 * Конфиг для Storybook и тестов кита; приложение собирает пакет своим Vite. Алиасы — имя пакета на его
 * исходники: истории пишут `import { Button } from '@haunt/ui'`, как экран приложения, а не относительный
 * путь. Точные совпадения (`^…$`) — чтобы `@haunt/ui` не перехватил `@haunt/ui/motion`.
 */
export default defineConfig({
  plugins: [react()],
  // Зависимости, которые грузятся через import() (подсветка, Markdown) или только в части историй (Tour —
  // radix-ui/internal, страница движения — Motion): без заранее собранных Vite находит их посреди прогона
  // и перезагружает страницу с тестами («Vite unexpectedly reloaded a test»), холодный прогон падает
  optimizeDeps: {
    include: [
      'radix-ui/internal',
      'motion/react',
      'shiki/core',
      'shiki/engine/javascript',
      ...highlightGrammars.map((name) => `shiki/dist/langs/${name}.mjs`),
      'react-markdown',
      'remark-gfm',
      'remark-breaks',
      'rehype-sanitize',
    ],
  },
  resolve: {
    alias: [
      { find: /^@haunt\/ui$/, replacement: src('index.ts') },
      { find: /^@haunt\/ui\/styles$/, replacement: src('styles.ts') },
      { find: /^@haunt\/ui\/motion$/, replacement: src('motion/index.ts') },
      { find: /^@haunt\/ui\/signal$/, replacement: src('signal.ts') },
      { find: /^@haunt\/ui\/fx$/, replacement: src('fx/index.ts') },
      { find: /^@haunt\/ui\/sound$/, replacement: src('sound/index.ts') },
    ],
  },
});
