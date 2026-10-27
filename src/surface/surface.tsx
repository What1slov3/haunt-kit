import { Box, type BoxProps } from '../box/box';
import { cx } from '../lib/cx';

import styles from './surface.module.css';

export interface SurfaceProps extends BoxProps {
  /** Высота слоя: 1 — самый тёмный / глубокий, 3 — самый светлый */
  level?: 1 | 2 | 3;
  /**
   * Панель приложения: почти непрозрачный фон поверх живого фона (рейл, список каналов, чат).
   * Уровни — как у Discord: 1 рейл, 2 боковая панель, 3 содержимое. Несёт зерно и прожектор.
   */
  panel?: boolean;
  /** Матовое стекло — только для плавающих слоёв (меню, поповеры, шапка над контентом) */
  glass?: boolean;
  /** Плавающая панель: тень и непрозрачный фон */
  floating?: boolean;
  /** Подсвечивается при наведении — для карточек-ссылок; прожектор включён */
  interactive?: boolean;
  /** Тонкая граница `--border` по краю; по умолчанию включена */
  border?: boolean;
  /** Прожектор за курсором (effects.css); по умолчанию — у panel и interactive */
  spotlight?: boolean;
  /** Зерно на поверхности; по умолчанию — у panel */
  grain?: boolean;
}

export function Surface({
  level = 1,
  panel,
  glass,
  floating,
  interactive,
  border = true,
  spotlight = Boolean(panel || interactive),
  grain = Boolean(panel),
  radius = 'lg',
  className,
  ...rest
}: SurfaceProps) {
  return (
    <Box
      radius={radius}
      className={cx(
        styles.surface,
        styles[`level-${level}`],
        panel && styles.panel,
        glass && styles.glass,
        floating && styles.floating,
        interactive && styles.interactive,
        border && styles.border,
        className,
      )}
      data-spotlight={spotlight || undefined}
      data-grain={grain || undefined}
      {...rest}
    />
  );
}
