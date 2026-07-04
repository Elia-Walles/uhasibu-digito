// Single source of truth for the password policy. Shared by the client-side
// PasswordChecklist UI and the server-side zod schemas so both stay in agreement.
// Labels are English source strings that flow through the i18n `t()` translator.

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "One number", test: (v) => /[0-9]/.test(v) },
];

export const PASSWORD_POLICY_MESSAGE =
  "Use 8+ characters with an uppercase letter, a lowercase letter and a number";

export function isStrongPassword(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

// Character pools for suggestions. Ambiguous glyphs (O 0 l 1 I) are excluded for readability.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?-_";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

/** Uniform random integer in [0, max) via rejection sampling — avoids modulo bias. */
function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    globalThis.crypto.getRandomValues(buf);
    value = buf[0]!;
  } while (value >= limit);
  return value % max;
}

/**
 * Generates a random password that always satisfies `isStrongPassword`: at least one uppercase,
 * lowercase, digit and symbol, with the remaining characters drawn from the combined pool and the
 * whole thing Fisher-Yates shuffled so the guaranteed characters aren't positionally predictable.
 * A fresh, different value on every call. Runs in browser and Node (uses Web Crypto).
 */
export function generateStrongPassword(length = 16): string {
  const size = Math.max(length, 8);
  const chars = [
    UPPER[randomInt(UPPER.length)]!,
    LOWER[randomInt(LOWER.length)]!,
    DIGITS[randomInt(DIGITS.length)]!,
    SYMBOLS[randomInt(SYMBOLS.length)]!,
  ];
  while (chars.length < size) {
    chars.push(ALL[randomInt(ALL.length)]!);
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
