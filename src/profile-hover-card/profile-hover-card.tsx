import { useEffect, useRef, useState, type PointerEvent, type ReactElement } from 'react';

import { HoverCard } from '../hover-card/hover-card';
import { Popover } from '../popover/popover';
import { ProfileCard, type ProfileCardProps } from '../profile-card/profile-card';

/** hover — только наведение мышью; click — клик, тап и клавиатура; both — и то и другое */
export type ProfileHoverCardTrigger = 'hover' | 'click' | 'both';

export interface ProfileHoverCardProps extends Omit<ProfileCardProps, 'variant'> {
  /** Триггер — имя автора, упоминание или аватар; получает пропсы через asChild */
  children: ReactElement;
  /** Чем открывается; по умолчанию both — мышью наведением, а кликом, тапом и с клавиатуры тоже */
  trigger?: ProfileHoverCardTrigger;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Задержки появления и ухода при наведении, мс */
  openDelay?: number;
  closeDelay?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

const WIDTH = 300;

type OpenProps = Pick<
  ProfileHoverCardProps,
  'open' | 'defaultOpen' | 'onOpenChange' | 'openDelay' | 'closeDelay' | 'side' | 'align'
>;

interface LayerProps extends Omit<OpenProps, 'openDelay' | 'closeDelay'> {
  openDelay: number;
  closeDelay: number;
  children: ReactElement;
  card: Omit<ProfileCardProps, 'variant'>;
}

/** Только мышь: примитив HoverCard как есть */
function HoverLayer({ children, card, side, align, ...root }: LayerProps) {
  return (
    <HoverCard.Root {...root}>
      <HoverCard.Trigger asChild>{children}</HoverCard.Trigger>

      <HoverCard.Content side={side} align={align} flush width={WIDTH}>
        <ProfileCard {...card} variant="popover" />
      </HoverCard.Content>
    </HoverCard.Root>
  );
}

/*
 * Клик (и наведение при `both`) — на Popover: фокус внутрь, Esc и клик снаружи закрывают, фокус
 * возвращается на триггер. Открытая наведением карточка закрывается при уходе мыши и фокус не забирает;
 * открытая кликом закреплена — стоит до Esc, клика снаружи или повторного клика по триггеру.
 */
function ClickLayer({
  children,
  card,
  hover,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  openDelay,
  closeDelay,
  side,
  align,
}: LayerProps & { hover: boolean }) {
  const [inner, setInner] = useState(defaultOpen);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const content = useRef<HTMLDivElement>(null);
  const open = openProp ?? inner;

  useEffect(() => {
    const handle = timer;

    return () => clearTimeout(handle.current);
  }, []);

  const setOpen = (next: boolean) => {
    clearTimeout(timer.current);

    if (openProp === undefined) setInner(next);

    onOpenChange?.(next);
  };

  const later = (next: boolean, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  };

  // Наведение — только мышью: на тач-экране pointerenter приходит перед тапом и открыл бы карточку дважды
  const hoverHandlers = hover
    ? {
        onPointerEnter: (event: PointerEvent) => {
          if (event.pointerType === 'mouse' && !pinned) later(true, openDelay);
        },
        onPointerLeave: (event: PointerEvent) => {
          if (event.pointerType === 'mouse' && !pinned) later(false, closeDelay);
        },
      }
    : {};

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setPinned(false);

        setOpen(next);
      }}
    >
      <Popover.Trigger
        asChild
        {...hoverHandlers}
        onClick={(event) => {
          // Клик открывает карточку, а не переход по ссылке-имени — в карточке есть свои действия.
          // preventDefault заодно выключает переключатель Radix: открытую наведением клик закрепляет,
          // а не закрывает
          event.preventDefault();

          const close = open && pinned;

          setPinned(!close);
          setOpen(!close);
        }}
      >
        {children}
      </Popover.Trigger>

      <Popover.Content
        side={side}
        align={align}
        flush
        style={{ width: WIDTH }}
        ref={content}
        {...hoverHandlers}
        onOpenAutoFocus={(event) => {
          // Фокус — на саму карточку, а не на первый значок: у значка подсказка, она открылась бы сразу
          // и съела бы первый Esc. Открытая наведением фокус не забирает вовсе
          event.preventDefault();

          if (pinned) content.current?.focus();
        }}
      >
        <ProfileCard {...card} variant="popover" />
      </Popover.Content>
    </Popover.Root>
  );
}

/**
 * Карточка профиля у имени, упоминания или аватара — конструкт: `ProfileCard variant="popover"` в стекле
 * вплотную. `trigger` — чем открывается: `both` (по умолчанию) — мышью наведением, кликом, тапом и с
 * клавиатуры; `hover` — только наведением (примитив HoverCard); `click` — только кликом (Popover). Всё, что
 * в карточке, — пропсы `ProfileCard`: данные участника приходят от экрана, сама карточка их не загружает.
 */
export function ProfileHoverCard({
  children,
  trigger = 'both',
  open,
  defaultOpen,
  onOpenChange,
  openDelay = 400,
  closeDelay = 150,
  side = 'right',
  align = 'start',
  ...card
}: ProfileHoverCardProps) {
  const layer = { open, defaultOpen, onOpenChange, openDelay, closeDelay, side, align, card };

  return trigger === 'hover' ? (
    <HoverLayer {...layer}>{children}</HoverLayer>
  ) : (
    <ClickLayer {...layer} hover={trigger === 'both'}>
      {children}
    </ClickLayer>
  );
}
