/**
 * Pure, dependency-free validation helpers. Each returns a human-readable error
 * string on failure or `null` when valid — composable in forms without a
 * validation library.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

export const isNonEmpty = (value: string): boolean => value.trim().length > 0;

export const minLength = (value: string, length: number): boolean => value.length >= length;

/** Loose international phone check: 7–15 digits once formatting is stripped. */
export const isPhone = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

/** Rule signature: return an error message or null. */
export type Rule = (value: string) => string | null;

/** Password policy used across register + reset: ≥8 chars, a letter and a number. */
export const isStrongPassword = (value: string): boolean =>
  value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

export const STRONG_PASSWORD_MESSAGE =
  'Your password must be at least 8 characters long and include a number and a letter.';

export const rules = {
  required: (message = 'This field is required'): Rule => (v) =>
    isNonEmpty(v) ? null : message,
  email: (message = 'Enter a valid email address'): Rule => (v) =>
    isEmail(v) ? null : message,
  min: (length: number, message?: string): Rule => (v) =>
    minLength(v, length) ? null : message ?? `Must be at least ${length} characters`,
  strongPassword: (message = STRONG_PASSWORD_MESSAGE): Rule => (v) =>
    isStrongPassword(v) ? null : message,
};

/** Run a list of rules and return the first error, or null if all pass. */
export const validate = (value: string, ruleList: Rule[]): string | null => {
  for (const rule of ruleList) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
};
