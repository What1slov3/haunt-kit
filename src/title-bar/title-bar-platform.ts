import { isApplePlatform } from '../lib/hotkey';

/** Чьи кнопки окна рисовать: «светофор» слева на macOS, квадратные справа на Windows, круглые — Linux */
export type WindowPlatform = 'mac' | 'windows' | 'linux';

/** `auto` — по платформе окна (`navigator.userAgentData.platform` / `navigator.platform`) */
export function resolveWindowPlatform(
  platform: WindowPlatform | 'auto',
  detected: string,
): WindowPlatform {
  if (platform !== 'auto') return platform;
  if (isApplePlatform(detected)) return 'mac';
  if (/win/i.test(detected)) return 'windows';

  return 'linux';
}
