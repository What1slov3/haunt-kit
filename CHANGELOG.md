# Изменения `@haunt/ui`

## 1.0.0 — 2026-10-27

Первая стабильная версия и повторная заморозка (`docs/decisions/0014-ui-kit-1-0.md`). Ниже — что вошло после
заморозки `0013` (коммит «Заморозка кита…»).

### Новое

- **Примитивы раскладки:** `Container`, `Spacer`, `Center`, `WithSidebar`, `Switcher`, `Reel`, `Bleed`,
  `Layer` + `LayerItem`, `Sticky` (`onStuckChange`, `data-stuck`), `Masonry` (+ чистые `masonryLayout`,
  `masonryColumns`).
- **Лейауты страниц:** `PageLayout` (лента, документ, обзор), `ChatLayout` (место-чат с панелью треда),
  `SettingsLayout` (разделы, форма, полоса несохранённых изменений). Отзываются на ширину своего места, не окна.
- **Шапки:** `SpaceHeader` (`page` / `compact`), `PlaceHeader` (вид места, тема, живая сессия), `ArtifactHeader`
  (автор, место, «собрано из обсуждения»).
- **Звук:** 23 звука набора; класс `category: 'ui' | 'motif'` (мотив до 3 с, своё прореживание);
  `sound.play(spec, { signal })`, `sound.stopAll()`; у голоса — импульс с шириной, FM, вибрато, тремоло, качание
  фильтра, перегруз, цвет шума; у звука — помещение по импульсной характеристике (`impulseResponse`) и эхо;
  мотивы по шагам с аккордами, ладами и транспонированием (`SequenceSpec`, `ScaleSpec`, `rescale`);
  `randomSound`, `randomSequence`, `randomMotif`; генератор `SoundDesigner`.
- **Токены из кода:** `tokens`, `tokenVar`, `tokenStyle`, `setTokens`, `readToken`, `TokenScope` (генератор
  `scripts/tokens.ts`); ручки косметики (`--author-paint`, `--trail-*`, `--aura-paint`, `--avatar-frame`).
- `FileDropOverlay` — бросить файл на весь экран; `StoreItemCard` — под косметику; `HoverCard.Content` —
  `flush`, `width`; `Select.Item` — `aside`; шрифт `Haunt TUI` для рамок и полос (генератор
  `scripts/tui-font.ts`); руководство в Storybook (быстрый старт, как пользоваться, расширять, поддерживать).

### Изменено

- `ProfileHoverCard` — в своей папке и на примитиве `HoverCard`; проп `trigger` (`both` по умолчанию: наведение,
  клик, тап, клавиатура; `hover`; `click`).
- `ToggleGroup` и `Tabs variant="segment"` — колодец с переезжающей плашкой выбранного; пункты 20 / 24 px.
- `Select.Trigger` — поверхность кнопки и двойной шеврон; в списке галочка слева, выбранный — акцентом.
- `ImageTransition` — эффекты `fade` (по умолчанию), `focus`, `reveal`, `wipe`; проп `cell` удалён, `dissolve`,
  `noise`, `scan` — тоже.
- `FloatingPanel` — радиус прилипания по умолчанию 72 px (был 24).
- Облик `ProfileCard` и строки сообщения — свой, не Discord; `AppShell` — в стиле Haunt; TUI-компоненты — на
  настоящих символах псевдографики; полосы прокрутки — под тему.
- Правила звука (`checkSound`): пик громкости вместо суммы голосов, длина и хвост — по классу; `DESIGN_LIMITS`
  разбит по классам; `scheduleSound` возвращает `{ end, tailEnd, output }`.

### Исправлено

- Блик `Achievement` выезжал шестиугольником за медаль; теперь идёт внутри маски, ровно от края до края.
- Открытая кликом `ProfileHoverCard` закрывалась по Esc со второго раза (фокус открывал подсказку значка).
- `ColorPicker` прыгал по ширине при смене подсказки читаемости; `InlineEdit` обрезал текст слишком рано
  (`maxChars` / `maxWidth`).

### Внутреннее

- `lib/assign-ref.ts` вместо шести копий; токены `--glass-filter`, `--segment-inset`, `--segment-raise` вместо
  повторов значений в 24 CSS-модулях; `Spacer` вместо самодельных распорок.
