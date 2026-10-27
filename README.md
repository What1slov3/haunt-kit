# Haunt UI

Дизайн-система Haunt — приложения для сообществ (что-то среднее между Reddit и Discord): ~150 компонентов
на React 19, CSS Modules и токенах, тёмная и светлая темы, акцент пространства, уровни эффектов, стиль
«сигнал», TUI-акценты, звуки интерфейса. Это снимок версии 1.0 для знакомства — кит живёт и развивается в
монорепозитории Haunt, сюда выгружается скриптом.

**Посмотреть:** Storybook на GitHub Pages — ссылка в описании репозитория. Начать — с «Демо → Пространство»:
пространство целиком из кита (чат с фото и видео, эфир, кинозал с фильтрами, галерея, настройки).
Переключатели темы, акцента, эффектов и TUI — в тулбаре сверху.

## Запустить у себя

Нужны Node 24 и pnpm 10 или новее (CI собирает той версией, что указана в workflow).

```bash
pnpm install
pnpm storybook        # http://localhost:6006
```

| Команда                | Что делает                                                                   |
| ---------------------- | ---------------------------------------------------------------------------- |
| `pnpm storybook`       | Storybook с горячей перезагрузкой                                            |
| `pnpm build-storybook` | статическая сборка в `storybook-static/`                                     |
| `pnpm test:unit`       | unit-тесты (jsdom)                                                           |
| `pnpm test:stories`    | истории как тесты в Chromium (нужен `pnpm exec playwright install chromium`) |
| `pnpm verify`          | линт, форматирование, типы и unit-тесты                                      |

## Где что

- `src/` — компоненты, по папке на компонент: код, стили, истории рядом. Публичное API — `src/index.ts` и
  входы `fx`, `sound`, `motion`, `signal`, `styles` (`package.json` → `exports`).
- `src/docs/` — страницы Storybook: введение, руководство (как пользоваться, расширять, поддерживать),
  токены, как собирать экраны, демо.
- `README.md` в `src/…` и `docs/ui-kit.md` — устройство и решения; `CHANGELOG.md` — что вошло в 1.0.
- Ссылки на `docs/` монорепозитория, которых здесь нет, — следы происхождения снимка.

## Публикация

Workflow `.github/workflows/storybook.yml` собирает Storybook и выкладывает его на GitHub Pages на каждый пуш
в `main`. Один раз: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Медиа

Фото и видео в примерах — CC0 и общественное достояние с Wikimedia Commons, авторы и ссылки —
`src/lib/stories/media/CREDITS.md`. Шрифты — из `@fontsource` (SIL Open Font License).
