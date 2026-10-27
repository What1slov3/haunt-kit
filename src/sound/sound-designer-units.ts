/** Секунды звука → миллисекунды ползунка: в мс думать о коротких звуках проще */
export const ms = (seconds: number | undefined) => Math.round((seconds ?? 0) * 1000);

export const seconds = (value: number) => value / 1000;
