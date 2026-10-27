/** Состояние голосового соединения — приходит от приложения (LiveKit), панель только показывает его */
export type VoiceConnection = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

/** Качество связи по задержке: полоски сигнала и тон */
export type VoiceQuality = 'good' | 'fair' | 'poor';

/** Качество по задержке, мс: до 100 — хорошо, до 250 — терпимо, дальше — плохо */
export function qualityFromPing(ping: number): VoiceQuality {
  if (ping <= 100) return 'good';

  return ping <= 250 ? 'fair' : 'poor';
}
