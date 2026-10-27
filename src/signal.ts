/*
 * Вход `@haunt/ui/signal` — стиль «сигнал» (дополнение к основной теме, включается `data-style="signal"` на
 * любом контейнере) и его дисплейные шрифты. Как `styles.ts`, это модуль с побочными эффектами: импортируется
 * один раз там, где стиль нужен (экран, Storybook). Без импорта кит выглядит и весит как раньше.
 *
 * Шрифты — все кандидаты: владелец выбирает, глядя в интерфейс (`data-signal-font` на контейнере). Первые
 * четыре без кириллицы, последние четыре (Unbounded, Oswald, Exo 2, Tektur) — с ней.
 * Сами файлы шрифтов браузер качает, только когда текст этим шрифтом действительно рисуется.
 */
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/big-shoulders-display';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/oswald';
import '@fontsource-variable/exo-2';
import '@fontsource-variable/tektur/wdth.css';
import './signal/signal.css';
