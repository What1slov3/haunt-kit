import type { Decorator, Preview } from '@storybook/react-vite';

// Шрифты, токены, сброс, keyframes и эффекты — тот же вход, что импортирует приложение
import '@haunt/ui/styles';
// Стиль «сигнал» и его шрифты: без data-style="signal" (тулбар «Стиль») не меняет ни одной истории
import '@haunt/ui/signal';
import { MotionProvider } from '@haunt/ui/motion';
import { AmbientBackground, ThemeProvider, Toaster, UiStringsProvider } from '@haunt/ui';

import { HauntDocsContainer } from './docs-container';
import { mdxComponents } from './mdx-components';
import { applyGlobals, defaultGlobals, hauntGlobalTypes, resolveGlobals } from './haunt-globals';
import './preview.css';

/*
 * Декоратор вокруг каждой истории — то же окружение, что даёт приложению `app.tsx`: ThemeProvider
 * (провайдер подсказок, прожектор), Toaster и живой фон; MotionProvider — для страниц документации,
 * которые показывают пресеты Motion (ядро кита Motion не использует). Глобалы тулбара применяются к <html>
 * до рендера, а не в эффекте: иначе первый кадр, скриншот и проверки play видели бы прошлую тему.
 */
const withHauntTheme: Decorator = (Story, context) => {
  const globals = resolveGlobals(context.globals);
  const inDocs = context.viewMode === 'docs';

  applyGlobals(globals);

  return (
    // Строки снаружи всего: тосты и всплывающее тоже говорят на языке из тулбара
    <UiStringsProvider locale={globals.locale}>
      {/* key — ThemeProvider читает тему с <html> один раз при монтировании; смена темы его пересоздаёт */}
      <ThemeProvider key={globals.theme}>
        {!inDocs && globals.background !== 'none' && (
          <AmbientBackground variant={globals.background} reaction={globals.reaction} />
        )}

        <MotionProvider>
          <Story />
        </MotionProvider>

        {!inDocs && <Toaster />}
      </ThemeProvider>
    </UiStringsProvider>
  );
};

const preview: Preview = {
  globalTypes: hauntGlobalTypes,
  initialGlobals: { ...defaultGlobals },
  decorators: [withHauntTheme],
  parameters: {
    layout: 'padded',
    controls: {
      expanded: true,
      sort: 'requiredFirst',
      matchers: { color: /(background|color)$/i },
    },
    docs: {
      container: HauntDocsContainer,
      // Элементы MDX — компонентами кита (mdx-components.tsx); описания autodocs — прозой из preview.css
      components: mdxComponents,
      // Разделы и подразделы; живые примеры на странице (`.skip-toc`) в оглавление не попадают
      toc: { headingSelector: 'h2, h3', ignoreSelector: '.docs-story *, .skip-toc *' },
    },
    // Нарушения показываются в панели и в выводе тестов, но не валят прогон (см. .storybook/README.md)
    a11y: { test: 'todo' },
    options: {
      storySort: {
        order: [
          'Введение',
          'Демо',
          'Руководство',
          [
            'Быстрый старт',
            'Как пользоваться',
            'Как расширять',
            'Как поддерживать',
            'Storybook изнутри',
            'Частые ошибки',
          ],
          'Токены',
          'Движение и эффекты',
          'Как собирать экраны',
          'Стиль «сигнал»',
          'Тема',
          'Раскладка',
          'Лейауты',
          'Текст',
          'Кнопки',
          'Поля',
          'Отображение',
          'Данные',
          'Списки',
          'Всплывающее',
          'Сообщество',
          'Блоки',
          'Медиа',
          'TUI',
          'Сигнал',
          'Движение',
          'Эффекты',
          'Фон',
        ],
      },
    },
  },
};

export default preview;
