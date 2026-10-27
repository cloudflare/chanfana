/**
 * Builds a Zod `.pick()`/`.omit()` mask from a list of keys.
 */
export function keysMask(keys: Array<string>): Record<string, true> {
  return Object.fromEntries(keys.map((key) => [key, true]));
}
