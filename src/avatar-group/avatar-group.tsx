import type { ComponentPropsWithRef } from 'react';

import { Avatar, type AvatarSize, type AvatarStatus } from '../avatar/avatar';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { Tooltip } from '../tooltip/tooltip';

import { hiddenNamesLabel, splitOverflow } from './avatar-group-model';
import styles from './avatar-group.module.css';

export interface AvatarGroupItem {
  /** Ключ списка; по умолчанию — имя */
  id?: string;
  name: string;
  src?: string;
  /**
   * Точка статуса — показывается только у последнего видимого: у остальных её место закрывает сосед.
   * Под плашкой «+N» точка остаётся видна — плашка вырезана под неё
   */
  status?: AvatarStatus;
}

export interface AvatarGroupProps extends ComponentPropsWithRef<'div'> {
  items: AvatarGroupItem[];
  /** Сколько аватаров показать; остальные — плашкой «+N» с подсказкой-списком */
  max?: number;
  /** Как у Avatar: 20 / 24 / 32 / 40 / 64 px */
  size?: AvatarSize;
  /** Подпись группы для скринридера: «В голосовом: 7» */
  label?: string;
  /** Имя в подсказке при наведении на аватар */
  showNames?: boolean;
  /** circle — люди, rounded — сообщества: вырез повторяет скругление соседа */
  shape?: 'circle' | 'rounded';
}

/**
 * Наложенные аватары людей: кто в голосовом, кто поставил реакцию. Каждый следующий лежит поверх
 * предыдущего, а под него в предыдущем вырезано прозрачное отверстие маской (решение 8): группа
 * одинаково выглядит на панели, плитке, стекле и градиенте. Вырез повторяет форму соседа: круг или
 * квадрат со скруглением (`shape="rounded"`, аватары сообществ).
 */
export function AvatarGroup({
  items,
  max,
  size = 'sm',
  label,
  showNames = true,
  shape = 'circle',
  className,
  ...rest
}: AvatarGroupProps) {
  const { visible, hidden } = splitOverflow(items, max);
  const strings = useUiStrings();
  const hiddenNames = hiddenNamesLabel(
    hidden.map((item) => item.name),
    undefined,
    strings.avatarGroup.andMore,
  );
  const lastStatus = visible.at(-1)?.status;
  // Точку последнего видимого накрывает плашка «+N»: ей и аватару под ней нужна маска-исключение
  const keepStatus = Boolean(lastStatus) && hidden.length > 0;

  return (
    <div
      role="group"
      aria-label={label}
      className={cx(styles.group, styles[size], styles[shape], className)}
      {...rest}
    >
      {visible.map((item, index) => {
        const isLast = index === visible.length - 1;
        const avatar = (
          <Avatar
            key={item.id ?? item.name}
            name={item.name}
            src={item.src}
            size={size}
            shape={shape}
            status={isLast ? item.status : undefined}
            className={cx(styles.item, isLast && keepStatus && styles.keepStatus)}
          />
        );

        return showNames ? (
          <Tooltip key={item.id ?? item.name} content={item.name}>
            {avatar}
          </Tooltip>
        ) : (
          avatar
        );
      })}

      {hidden.length > 0 && (
        <Tooltip content={hiddenNames}>
          {/* Фокусируемая: подсказка со списком открывается и с клавиатуры */}
          <span
            className={cx(styles.item, styles.more, keepStatus && styles.statusCut)}
            tabIndex={0}
            role="img"
            aria-label={strings.avatarGroup.more(hidden.length, hiddenNames)}
          >
            +{hidden.length}
          </span>
        </Tooltip>
      )}
    </div>
  );
}
