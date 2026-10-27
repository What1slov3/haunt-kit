import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';

import { Copy, Maximize2, Minus, Plus, Square, X } from 'lucide-react';

import { Icon } from '../icon/icon';
import { currentPlatform } from '../lib/hotkey';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import { resolveWindowPlatform, type WindowPlatform } from './title-bar-platform';
import styles from './title-bar.module.css';

export interface TitleBarProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** Чьи кнопки окна: `auto` — по платформе */
  platform?: WindowPlatform | 'auto';
  /** Название окна или пространства — в области перетаскивания */
  title?: ReactNode;
  /** Слева, после «светофора» macOS: логотип, назад / вперёд */
  start?: ReactNode;
  /** Меню приложения — `Menubar` */
  menu?: ReactNode;
  /** Поиск по центру, как в Discord и Linear */
  search?: ReactNode;
  /** Справа, перед кнопками окна: входящие, помощь */
  end?: ReactNode;
  onMinimize?: () => void;
  /** Развернуть / восстановить */
  onMaximize?: () => void;
  onClose?: () => void;
  /** Окно развёрнуто: на Windows и Linux кнопка становится «восстановить» */
  maximized?: boolean;
  /** Окно не в фокусе: «светофор» серый, подпись тише — как у системных окон */
  inactive?: boolean;
  /** Кнопки окна; по умолчанию — если передан хоть один обработчик */
  windowControls?: boolean;
}

/**
 * Своя шапка окна Tauri (`decorations: false`). Перетаскивание — атрибутом `data-tauri-drag-region` на
 * фоне и заголовке: Tauri тянет окно, только если нажали прямо на элемент с атрибутом, поэтому меню, поиск и
 * кнопки внутри работают как обычно, а двойной клик по фону разворачивает окно. От Tauri зависимости нет —
 * в браузере это обычная полоса. Кнопки окна — по платформе, действия — пропсами (`getCurrentWindow()`
 * вызывает приложение).
 */
export function TitleBar({
  platform = 'auto',
  title,
  start,
  menu,
  search,
  end,
  onMinimize,
  onMaximize,
  onClose,
  maximized = false,
  inactive = false,
  windowControls,
  className,
  ...rest
}: TitleBarProps) {
  const strings = useUiStrings().titleBar;
  // Платформа окна не меняется за сессию — читается один раз
  const [detected] = useState(currentPlatform);
  const resolved = resolveWindowPlatform(platform, detected);
  const showControls = windowControls ?? Boolean(onMinimize || onMaximize || onClose);
  const mac = resolved === 'mac';

  const controls = showControls && (
    <div role="group" aria-label={strings.label} className={styles.controls}>
      {mac ? (
        <>
          <button
            type="button"
            aria-label={strings.close}
            disabled={!onClose}
            className={cx(styles.light, styles.lightClose)}
            onClick={onClose}
          >
            <Icon icon={X} size="xs" className={styles.glyph} />
          </button>

          <button
            type="button"
            aria-label={strings.minimize}
            disabled={!onMinimize}
            className={cx(styles.light, styles.lightMinimize)}
            onClick={onMinimize}
          >
            <Icon icon={Minus} size="xs" className={styles.glyph} />
          </button>

          <button
            type="button"
            aria-label={maximized ? strings.restore : strings.maximize}
            disabled={!onMaximize}
            className={cx(styles.light, styles.lightMaximize)}
            onClick={onMaximize}
          >
            <Icon icon={maximized ? Minus : Plus} size="xs" className={styles.glyph} />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            aria-label={strings.minimize}
            disabled={!onMinimize}
            className={styles.windowButton}
            onClick={onMinimize}
          >
            <Icon icon={Minus} size="sm" />
          </button>

          <button
            type="button"
            aria-label={maximized ? strings.restore : strings.maximize}
            disabled={!onMaximize}
            className={styles.windowButton}
            onClick={onMaximize}
          >
            <Icon
              icon={resolved === 'linux' ? Maximize2 : maximized ? Copy : Square}
              size={resolved === 'linux' ? 'xs' : 'sm'}
            />
          </button>

          <button
            type="button"
            aria-label={strings.close}
            disabled={!onClose}
            className={cx(styles.windowButton, styles.closeButton)}
            onClick={onClose}
          >
            <Icon icon={X} size={resolved === 'linux' ? 'xs' : 'sm'} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div
      data-tauri-drag-region=""
      data-platform={resolved}
      data-inactive={inactive || undefined}
      className={cx(styles.root, className)}
      {...rest}
    >
      {mac && controls}

      {start && <div className={styles.slot}>{start}</div>}

      {menu && <div className={styles.slot}>{menu}</div>}

      <div data-tauri-drag-region="" className={styles.drag}>
        {title && (
          <span data-tauri-drag-region="" className={styles.title}>
            {title}
          </span>
        )}
      </div>

      {search && <div className={cx(styles.slot, styles.search)}>{search}</div>}

      <div data-tauri-drag-region="" className={styles.drag} />

      {end && <div className={styles.slot}>{end}</div>}

      {!mac && controls}
    </div>
  );
}
