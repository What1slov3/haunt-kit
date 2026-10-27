import { lazy, Suspense, useEffect, useState } from 'react';

import { useToasts } from './toast-store';

export interface ToasterProps {
  /** Угол экрана; по умолчанию — справа внизу, как в десктопных приложениях */
  position?: 'bottom-right' | 'top-right';
}

// Radix Toast с его коллекцией и слоями — ~30 kB, а уведомление бывает не на каждом экране
const ToasterView = lazy(() => import('./toaster-view'));

/**
 * Вьюпорт уведомлений. Один на приложение, внутри ThemeProvider. Показывает очередь `toast`. Сам вьюпорт
 * подгружается при первом уведомлении и дальше остаётся смонтированным: у тостов есть анимация ухода,
 * а повторная загрузка не нужна.
 */
export function Toaster({ position = 'bottom-right' }: ToasterProps) {
  const items = useToasts();
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    if (items.length > 0) setNeeded(true);
  }, [items.length]);

  if (!needed) return null;

  return (
    <Suspense fallback={null}>
      <ToasterView position={position} />
    </Suspense>
  );
}
