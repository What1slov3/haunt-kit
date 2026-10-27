/*
 * Необязательный вход `@haunt/ui/motion`: пресеты движения для Motion и провайдер. Ядро кита Motion не
 * использует — индикаторы вкладок и подсветка канала переезжают через FLIP (lib/use-shared-indicator.ts).
 * Нужен пакет `motion` в зависимостях приложения (у кита он необязательный peer).
 */
export { durations, easeOut, fadeUp, scaleIn, springs, staggerList } from './presets';
export { MotionProvider, type MotionProviderProps } from './motion-provider';
