# Как устроен Storybook, по шагам

Storybook — каталог дизайн-системы `packages/ui/src`: по истории на каждое состояние примитива, страница
документации с таблицей пропсов, MDX-страницы про токены и эффекты, и каждая история — ещё и тест в
браузере. Витрина `/ui` после переезда каталога сюда показывает только живую композицию (мессенджер и эффекты).

```sh
pnpm --filter @haunt/ui storybook         # dev-сервер, http://localhost:6006
pnpm --filter @haunt/ui build-storybook   # статическая сборка в packages/ui/storybook-static
pnpm --filter @haunt/ui test:stories      # истории как тесты в Chromium
pnpm --filter @haunt/ui test              # юнит-тесты (jsdom) + истории
```

## 1. Установка

**Что.** В `devDependencies` пакета `packages/ui` (до выноса кита в пакет — `apps/web`): `storybook`, `@storybook/react-vite`, `@storybook/addon-docs`,
`@storybook/addon-a11y`, `@storybook/addon-vitest` (все 10.6.3), `@vitest/browser-playwright` и
`@playwright/test` с Chromium. `storybook init` не запускался — конфиг написан руками.

**Зачем руками.** `init` сам ставит пакеты, дописывает примеры историй в `src/stories`, создаёт свой
`vitest.config` и setup-файл. Здесь всё это не нужно, а то, что нужно, лучше понимать построчно.

**Телеметрия выключена** дважды: `core.disableTelemetry: true` в `main.ts` и флаг `--disable-telemetry` в
скриптах. Флаг — кросс-платформенная замена `STORYBOOK_DISABLE_TELEMETRY=1 storybook …`: такая запись
переменной не работает в `cmd.exe`, на котором pnpm запускает скрипты под Windows, а `cross-env` — лишняя
зависимость.

**Где.** `packages/ui/package.json` — скрипты `storybook`, `build-storybook`, `test:stories`, `test:unit`.

## 2. `main.ts` — что собирать и чем

**Что.**

- `framework: '@storybook/react-vite'` с `viteConfigPath: 'vite.config.ts'` — Storybook собирает истории
  Vite-конфигом пакета (`packages/ui/vite.config.ts`): алиасы `@haunt/ui` на исходники (истории импортируют кит по
  имени пакета, как приложение), `@vitejs/plugin-react`, CSS Modules работают без отдельной настройки;
- `stories` — `src/**/*.mdx` и `src/**/*.stories.tsx`: истории лежат рядом с
  примитивами, MDX-страницы — в `src/docs/`;
- `addons` — docs (autodocs и MDX), a11y (панель доступности), vitest (запуск историй как тестов). У docs —
  `options.mdxPluginOptions.mdxCompileOptions.remarkPlugins: [remarkGfm]`: GFM в MDX, обычные
  markdown-таблицы, зачёркивание и списки задач рендерятся, а не выводятся текстом с палками;
- `features.backgrounds: false` — фон холста задаёт тема (`body` → `var(--bg)`), встроенный переключатель
  фонов спорил бы с ней;
- `features.sidebarOnboardingChecklist: false` и `core.disableWhatsNewNotifications: true` — без виджета
  «Get started» и плашки «What's new» в сайдбаре: конфиг написан руками, реклама обновлений каталогу не нужна;
- `typescript.reactDocgen: 'react-docgen-typescript'` — таблицу пропсов строит компилятор TS. Пропсы кита
  объявлены как `interface ButtonProps extends ComponentPropsWithRef<'button'>`, и только TS умеет достать
  из них собственные поля с JSDoc. `propFilter` прячет всё, что пришло из `node_modules` (сотни
  HTML-атрибутов и пропсов Radix), — в таблице остаются только поля, добавленные китом.

**Где.** `.storybook/main.ts`.

## 2а. Интерфейс Storybook в духе Fumadocs

**Что.** Менеджер (сайдбар, тулбар, панели) оформлен как документация Fumadocs: нейтральный серый, сайдбар
на фоне чуть темнее содержимого, тонкие рамки, активный пункт — тон акцента и цветной текст, а не сплошная
заливка.

- `storybook-themes.ts` — две темы `create()`: значения — копии токенов основы из `tokens.css` (менеджер —
  другой документ и CSS-переменных кита не видит).
- `manager.ts` — по умолчанию тёмная тема; аддон `haunt/theme-sync` слушает `SET_GLOBALS` и
  `GLOBALS_UPDATED` и вызывает `api.setOptions({ theme })`: интерфейс следует кнопке **Тема** в тулбаре, как
  сайдбар Fumadocs следует теме страницы. Тема ставится и атрибутом `data-haunt-theme` на `<html>` менеджера.
- `manager-head.html` — то, чего тема Storybook не умеет: тонированный активный пункт (по
  `[data-selected='true']`, свой цвет в каждой теме через `data-haunt-theme`), скругление пунктов,
  моно-капитель у заголовков групп. Селекторы — по data-атрибутам: классы Storybook генерируются.

**Где.** `.storybook/storybook-themes.ts`, `.storybook/manager.ts`, `.storybook/manager-head.html`.

## 2б. Страницы документации из компонентов кита

**Что.** Элементы MDX подменены через `parameters.docs.components` (`mdx-components.tsx`): заголовки —
`Heading` (у `##` — TUI-маркер `>`, у всех — якорь для оглавления), абзац — `Text as="p"`, ссылка — `Link`,
блок кода — `CodeBlock` (язык из `language-*`, заголовок из `title="…"` в мета-строке), цитата — `Callout`,
`---` — `Divider`, таблицы и списки — разметка с классами из `mdx.module.css`. Оглавление справа собирает
`h2` и `h3` (`toc.headingSelector`), живые примеры в рамке `.skip-toc` в него не попадают.

**Зачем так.** Раньше проза была элементами Storybook, перекрашенными селекторами `.sbdocs-content h2` поверх
его emotion-стилей: страница документации выглядела «почти как кит» и ломалась с каждой версией Storybook.
Теперь она сделана из того же, из чего экраны, и следует теме, акценту и «сигналу» из тулбара.

**Как работает.** Каждый корень получает класс `sb-unstyled` — собственные стили документации Storybook
написаны как `:not(.sb-unstyled, .sb-unstyled *)` и такие элементы не трогают. Ссылка на другую страницу
(`?path=/docs/…`) уходит в менеджер событием `NAVIGATE_URL` — как у ссылок Storybook: иначе каталог открылся
бы внутри фрейма. Мета-строку блока кода MDX сам не передаёт: её кладёт в свойства `<code>` маленький
remark-плагин `remarkCodeTitle` в `main.ts`. Описания autodocs Storybook рендерит сам — для них осталась проза
в `preview.css`.

Страница не проходит через декоратор историй, поэтому `HauntDocsContainer` оборачивает её в те же провайдеры
(`UiStringsProvider`, `ThemeProvider`, `Toaster`): живые примеры прямо в MDX получают тему, язык и подсказки.

**Где.** `.storybook/mdx-components.tsx`, `.storybook/mdx.module.css`, `.storybook/docs-container.tsx`,
`remarkCodeTitle` в `.storybook/main.ts`; страницы руководства — `src/docs/guide/`, их живые примеры —
`src/docs/guide-blocks.tsx`.

## 3. `preview.tsx` и декоратор

**Что.** `preview.tsx` выполняется в iframe, где рендерятся истории.

- Импорт `@haunt/ui` подтягивает то же, что получает приложение: шрифты Inter и JetBrains Mono, `tokens.css`,
  сброс `global.css`, keyframes и эффекты. Отдельного «storybook.css» с копией токенов нет.
- **Декоратор `withHauntTheme`** оборачивает каждую историю тем же окружением, что `app.tsx` даёт
  приложению: `ThemeProvider` (Motion, провайдер подсказок Radix, прожектор), `Toaster` и, если выбран,
  `AmbientBackground`.
- Глобалы тулбара применяются к `<html>` **прямо в теле декоратора, до рендера**, а не в `useEffect`: иначе
  первый кадр, скриншот и проверки play-функции видели бы прошлую тему.
- `ThemeProvider` получает `key={theme}`: он читает тему с `<html>` один раз при монтировании, и смена темы
  должна его пересоздать.

**Страницы документации** проходят не через декоратор: истории на странице рендерятся каждая в свой React-корень,
а сама страница — в `docs.container`. Поэтому `HauntDocsContainer` сам слушает смену глобалов (событие
`globalsUpdated` в канале Storybook), применяет их к `<html>` и переключает оформление документации. Там же —
один `Toaster` и один живой фон на страницу: в декораторе каждой истории их было бы по копии.

**Где.** `.storybook/preview.tsx` (декоратор, параметры, порядок разделов в `storySort`),
`.storybook/docs-container.tsx`, `.storybook/preview.css` — проза страниц документации в духе Fumadocs:
текст 15 px с ритмом 1.7, заголовки полужирные без подчёркиваний и с TUI-маркером `>` у разделов, инлайн-код
в рамке, таблицы и превью историй карточками (у превью — мягкое свечение акцента снизу), имена пропсов
моно цветом акцента. У элементов MDX в Storybook 10 нет своих классов — их красит emotion позже этого файла,
поэтому селекторы начинаются с `.sbdocs-wrapper .sbdocs.sbdocs-content` (на класс специфичнее), а
`:not(.sb-unstyled *)` не пускает правила внутрь историй на странице.

## 4. Тулбар через `globalTypes`

**Что.** Десять переключателей — те же оси, что в шапке витрины `/ui`:

| Глобал         | Значения                        | Что ставит декоратор                                          |
| -------------- | ------------------------------- | ------------------------------------------------------------- |
| `theme`        | `dark` (по умолчанию) / `light` | `data-theme` на `<html>`                                      |
| `accent`       | пресеты `accentPresets`         | `--accent`, `--accent-2`, `--accent-contrast` на `<html>`     |
| `background`   | `none`, фоны кита и `fx`        | `<AmbientBackground variant>` под историей (fx-фоны — лениво) |
| `reaction`     | `off` / `quiet` / `vivid`       | `reaction` живого фона                                        |
| `effects`      | `off` / `subtle` / `rich`       | `data-effects` на `<html>`                                    |
| `tui`          | `on` / `off`                    | `data-tui` на `<html>`                                        |
| `style`        | `base` / `signal`               | `data-style` на `<html>` (стиль «сигнал»)                     |
| `signalFont`   | `signalFonts` (десять)          | `data-signal-font` на `<html>`                                |
| `signalAccent` | `signalAccents`                 | `data-signal-accent` на `<html>`                              |
| `locale`       | `ru` (по умолчанию) / `en`      | `UiStringsProvider` вокруг истории и `lang` на `<html>`       |

**Зачем так.** Компоненты не знают про Storybook: тема и акцент доходят до них атрибутами и
CSS-переменными, как в приложении. Поэтому история не принимает «тему» пропсом, и одна и та же история
проверяется в любой комбинации.

- Значения пишутся прямо в `dataset`, а не через `applyTheme` / `applyEffects`: те сохраняют выбор в
  `localStorage`, и тема из Storybook просочилась бы в `pnpm dev` на том же `localhost`.
- Фон по умолчанию `none`: в истории нужна сама деталь, а canvas с частицами в каждом тесте замедлял бы прогон.

**Где.** `.storybook/haunt-globals.ts` — `hauntGlobalTypes`, `defaultGlobals`, `applyGlobals`.

## 5. CSF3 и `args`

**Что.** Истории — Component Story Format 3: файл экспортирует `meta` (`default`) и истории-объекты.

```tsx
const meta = {
  title: 'Кнопки/Button', // раздел в сайдбаре — группа из packages/ui/README.md
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Отправить', onClick: fn() }, // общие значения для всех историй
  argTypes: { iconStart: { control: false } }, // ReactNode в контролах не редактируется
} satisfies Meta<typeof Button>;

export const Loading: Story = { args: { variant: 'primary', loading: true } };
```

- **Одна история — одно состояние:** варианты, размеры, `disabled`, `loading`, `invalid`, длинный текст.
  Так каждое состояние видно на странице документации, у него своя ссылка, и оно же — отдельный тест.
- `args` — пропсы истории; панель **Controls** меняет их на лету. `fn()` из `storybook/test` — шпион:
  вызовы видны на панели **Actions** и проверяются в play-функции.
- `satisfies Meta<typeof X>` вместо аннотации — TS проверяет `meta` и при этом выводит точный тип `args`
  для `StoryObj<typeof meta>`.
- У составных примитивов (`Dialog`, `Select`, `DropdownMenu`) `component` — маленький демо-компонент в файле
  истории, а части кита показаны через `subcomponents` — вкладки с их пропсами на странице документации.
- Импорт — из публичного API `@haunt/ui`, как в приложении.

**Где.** `src/<name>/<name>.stories.tsx`, 58 файлов. Образцы: `button/button.stories.tsx` (простой
примитив), `dropdown-menu/dropdown-menu.stories.tsx` (составной, с play-функциями).

## 6. Autodocs и MDX

**Autodocs.** `tags: ['autodocs']` в `meta` даёт примитиву страницу **Docs**: описание
(`parameters.docs.description.component`), первая история с контролами, таблица пропсов и все истории ниже.
Описания пропсов — **JSDoc в самих компонентах** (`/** 24 / 28 / 32 px */ size?: ButtonSize`): одна правда
для редактора и для документации. Частям составных примитивов добавлен `displayName` (`'Dialog.Content'`) —
так они подписаны во вкладках и в «Show code».

**MDX** — страницы, которых нет у отдельного компонента:

- «Введение» — что это и как пользоваться тулбаром;
- «Токены» — значения читаются из CSS прямо на странице (`getComputedStyle`) и перечитываются при смене
  темы или акцента: таблица не расходится с `tokens.css`;
- «Движение и эффекты» — уровни `--fx-*` и те же примитивы при трёх уровнях рядом;
- «Как собирать экраны» — композиция и ссылка на мини-мессенджер в `/ui`.

Таблицы на MDX-страницах — обычный markdown (GFM через `remark-gfm`, см. шаг 2); прежний компонент
`DocTable` больше не нужен и удалён.

**Где.** `src/docs/*.mdx`; живые блоки — `token-blocks.tsx`, `effects-blocks.tsx`,
`composition-blocks.tsx`, хук `use-live-tokens.ts`.

## 7. `play`-функции

**Что.** `play` выполняется после рендера истории: кликает, нажимает клавиши и проверяет результат через
`storybook/test` (`expect`, `userEvent`, `within`, `waitFor`). Ход виден по шагам на панели
**Interactions**.

```tsx
export const ClosesOnEscape: Story = {
  name: 'Закрывается по Esc',
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Меню' });

    await userEvent.click(trigger);
    await expectVisible(await screen().findByRole('menu'));
    await pressEscape();
    await expectGone(() => screen().queryByRole('menu'));
    await expectFocused(trigger);
  },
};
```

Что проверяется: всплывающие слои (DropdownMenu, ContextMenu, Popover, Dialog, Select) открываются и
закрываются по Esc, кликом снаружи и выбором пункта, фокус возвращается на триггер; Tooltip и HoverCard —
по наведению и фокусу; Tabs, Toggle, ToggleGroup, Switch, Checkbox, RadioGroup, Slider — мышью и клавиатурой;
Collapsible, Accordion, Toast, Field, Chip. Блоки (`CodeBlock` — копирование, `FileTree` — сворачивание, `Banner` — закрытие, `Steps`, `Card`) и `FilteredImage` (кадр нарисован, при `effects: off` — обычное изображение). Всего 92 play-функции.

Общие шаги — `src/lib/stories/play-helpers.ts`, и у каждого есть причина:

- `screen()` — всплывающее порталится в `<body>`, а не в холст истории;
- `expectVisible` — появление начинается с `opacity: 0`, сразу после открытия слой ещё «невидим»;
- `expectGone` — слой должен **размонтироваться**. Это главный регресс кита: если keyframes не нашлись
  (CSS Modules локализовали имя), Radix Presence не дождётся `animationend`, и закрытое меню останется в DOM;
- `clickOutside` — модальные слои Radix ставят на `<body>` `pointer-events: none`, и `userEvent` отказался бы
  кликать, поэтому `pointerdown` отправляется вручную.

Тосты живут в общей очереди модуля, поэтому истории тостов чистят её (`toast.clear()`) перед проверкой.

## 8. Интеграция с vitest

**Что.** `vitest.config.ts` пакета — два проекта (`test.projects`):

- `unit` — прежние юнит-тесты в jsdom (`src/**/*.test.{ts,tsx}`);
- `storybook` — плагин `storybookTest` из `@storybook/addon-vitest` превращает каждую историю в тест:
  рендер с декоратором и параметрами из `preview.tsx`, затем `play`. Идёт в настоящем Chromium через
  `@vitest/browser-playwright` (headless): Radix, анимации появления и фокус в jsdom ведут себя иначе, чем в
  приложении. Setup-файл не нужен — плагин сам применяет аннотации проекта.

`optimizeDeps.include` у проекта `storybook` — чтобы Vite не находил зависимости посреди прогона и не
перезагружал страницу с тестами («Vite unexpectedly reloaded a test»).

**Проверки доступности.** `a11y: { test: 'todo' }`: нарушения видны на панели **Accessibility** и в выводе
тестов, но не валят прогон. Перевод на `'error'` — отдельное решение, после разбора текущих замечаний.

**Почему истории входят в `pnpm test`.** Все 336 историй проходят за 12–18 с (холодный старт с пересборкой
зависимостей — около 20 с), это меньше заданного порога в 40 с. Поэтому `pnpm test` пакета, а с ним и корневые
`pnpm test` и `pnpm verify`, гоняет оба проекта, и сломанная история ловится до коммита. Если прогон
разрастётся, `test` можно сузить до `vitest run --project unit` — отдельный `test:stories` уже есть.

**Где.** `packages/ui/vitest.config.ts`; скрипты `test` (оба проекта), `test:unit`, `test:stories`.

## 9. Сборка и выкладка

**Что.** `pnpm --filter @haunt/ui build-storybook` собирает статический сайт в `packages/ui/storybook-static`
(около 10 МБ, ~20 с). Это обычные HTML, JS и CSS: их отдаёт любой статический сервер (локально —
`pnpm --filter @haunt/ui exec vite preview --outDir storybook-static`, в проде — nginx), их можно
выложить на GitHub Pages, Cloudflare Pages или S3.

`storybook-static/`, а также `__screenshots__/` и `.vitest-attachments/` (их пишет vitest-browser при падении
истории) — в корневом `.gitignore`, `.prettierignore` и в ignores `eslint.config.js`.

Для CI достаточно двух шагов: `pnpm --filter @haunt/ui test` (истории как тесты) и `build-storybook`
(артефакт для выкладки). Для `test` в CI нужен установленный Chromium Playwright.

## Как добавить историю для нового примитива

```tsx
// src/<name>/<name>.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Thing } from '@haunt/ui';

const meta = {
  title: 'Отображение/Thing', // группа — как в таблице packages/ui/README.md
  component: Thing,
  tags: ['autodocs'],
  args: { children: 'Текст' },
} satisfies Meta<typeof Thing>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
```

Дальше: JSDoc у пропсов (они станут описаниями в таблице), по истории на каждое состояние, `play` — если
примитив интерактивный. Storybook подхватит файл сам, `pnpm --filter @haunt/ui test:stories` — проверит.
