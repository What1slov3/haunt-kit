/*
 * Проверка поддержки scroll-driven анимаций — отдельно от компонента: файл с компонентом экспортирует
 * только компоненты (Fast Refresh), а проверка нужна и экранам со своим CSS на animation-timeline.
 */

let timelineSupported: boolean | undefined;

/** Есть ли scroll-driven анимации (`animation-timeline: view()`): Chromium 115+, Safari 26+ */
export function supportsScrollTimeline(): boolean {
  timelineSupported ??=
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: view()');

  return timelineSupported;
}
