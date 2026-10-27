import type { ComponentPropsWithRef } from 'react';

import { ArrowDown } from 'lucide-react';

import { Badge } from '../badge/badge';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { Presence } from '../motion-core/presence';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './jump-to-latest.module.css';

export interface JumpToLatestProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'onClick'
> {
  /** Показана: лента прокручена вверх от последних. Появление и уход — `Presence` */
  visible: boolean;
  /** Сколько новых пришло, пока читали старое */
  count?: number;
  /** Вниз к последним — обычно `VirtualList` `scrollToEnd()` */
  onJump: () => void;
  /** Над лентой у нижнего края (по умолчанию) — родителю нужен `position: relative`; false — в потоке */
  floating?: boolean;
  /** Подпись поверх словаря */
  label?: string;
}

/**
 * Плавающая кнопка «к последним» со счётчиком новых: появляется, когда ленту увели вверх, и уходит, когда
 * она снова внизу. Стекло — как у остального плавающего. Решение «показать» и счётчик — у экрана: он знает,
 * внизу ли список и что пришло.
 */
export function JumpToLatest({
  visible,
  count,
  onJump,
  floating = true,
  label,
  className,
  ...rest
}: JumpToLatestProps) {
  const strings = useUiStrings().jumpToLatest;
  const counted = count !== undefined && count > 0;

  return (
    <Presence present={visible} animation="rise" className={cx(floating && styles.floating)}>
      <button
        type="button"
        className={cx(styles.button, className)}
        data-counted={counted || undefined}
        aria-label={counted && !label ? strings.withCount(count) : undefined}
        onClick={onJump}
        {...rest}
      >
        <Icon icon={ArrowDown} size="sm" />

        <span>{label ?? strings.label}</span>

        {counted && (
          <Badge tone="accent" variant="solid" size="sm">
            {strings.count(count)}
          </Badge>
        )}
      </button>
    </Presence>
  );
}
