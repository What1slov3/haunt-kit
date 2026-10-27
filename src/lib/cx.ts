/** Склейка классов: `cx(styles.root, active && styles.active, className)` */
export function cx(...parts: Array<string | false | null | undefined>): string | undefined {
  const joined = parts.filter(Boolean).join(' ');

  return joined || undefined;
}
