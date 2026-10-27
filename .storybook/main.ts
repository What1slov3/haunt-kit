import type { StorybookConfig } from '@storybook/react-vite';
import remarkGfm from 'remark-gfm';

interface MdNode {
  type: string;
  meta?: string | null;
  data?: { hProperties?: Record<string, unknown> };
  children?: MdNode[];
}

/*
 * Заголовок блока кода в MDX: ```tsx title="main.tsx". Мета-строку MDX сам не передаёт — плагин кладёт
 * title в свойства элемента <code>, и CodeBlock кита (.storybook/mdx-components.tsx) показывает его шапкой.
 */
function remarkCodeTitle() {
  const visit = (node: MdNode) => {
    const title = node.type === 'code' ? /title="([^"]+)"/.exec(node.meta ?? '')?.[1] : undefined;

    if (title) node.data = { ...node.data, hProperties: { ...node.data?.hProperties, title } };

    node.children?.forEach(visit);
  };

  return visit;
}

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    // Конфиг пакета: алиасы @haunt/ui на исходники, плагин React, CSS Modules — тот же Vite, что у тестов
    options: { builder: { viteConfigPath: 'vite.config.ts' } },
  },
  // MDX первыми: страницы «Введение», «Токены» и т. д. стоят в сайдбаре до примитивов (порядок — в preview)
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
  addons: [
    {
      name: '@storybook/addon-docs',
      // GFM в MDX: обычные markdown-таблицы, зачёркивание и списки задач рендерятся, а не выводятся текстом
      options: {
        mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm, remarkCodeTitle] } },
      },
    },
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  // Плашка «What's new» в сайдбаре — реклама обновлений Storybook, каталогу кита она не нужна
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // Фон холста задаёт тема (body → var(--bg)); встроенный переключатель фонов спорил бы с ней
  // sidebarOnboardingChecklist — виджет «Get started» в сайдбаре: конфиг написан руками, онбординг не нужен
  features: { backgrounds: false, sidebarOnboardingChecklist: false },
  typescript: {
    // react-docgen-typescript, а не react-docgen: пропсы объявлены через интерфейсы с extends
    // ComponentPropsWithRef<…>, и только TS-компилятор достаёт из них свои поля с JSDoc
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // Корневой tsconfig.json — только references, файлов в нём нет
      tsconfigPath: './tsconfig.lib.json',
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      // Сотни HTML-атрибутов и пропсов Radix в таблице прячут то, что добавил кит
      propFilter: (prop) => !prop.parent || !/node_modules/.test(prop.parent.fileName),
    },
  },
};

export default config;
