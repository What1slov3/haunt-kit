/*
 * Глобальные стили кита — отдельный вход `@haunt/ui/styles`, импортируется один раз в точке входа
 * приложения (и в preview Storybook). Только здесь побочные эффекты: шрифты, токены, сброс, keyframes и
 * эффекты. Остальной пакет помечен `sideEffects: false` (кроме CSS), поэтому неиспользуемые компоненты
 * вместе со своим CSS выпадают из сборки.
 *
 * Порядок важен: шрифт → токены → сброс (сброс читает токены) → анимации → эффекты.
 */
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './theme/tui-font.css';
import './theme/tokens.css';
import './theme/global.css';
import './theme/animations.css';
import './theme/effects.css';
