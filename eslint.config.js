// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Copy-gate reinforcement (P2.T7/T8 follow-up): a plain-JS string thrown
    // through apiError/Error bypasses the axios interceptor that localizes
    // server envelopes — exactly how the auth.service SESSION_REQUIRED English
    // leak slipped past the copy gate. Flags human-copy literals (≥3 lowercase
    // letters); SCREAMING_SNAKE codes and numeric literals are identifiers,
    // not copy.
    files: ['src/api/**/*.ts', 'app/**/*.ts', 'app/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='apiError'] > Literal[value=/[a-z]{3}/]",
          message:
            "apiError() message must be localized: pass i18n.t('…') instead of a literal string.",
        },
        {
          selector: "NewExpression[callee.name='Error'] > Literal[value=/[a-z]{3}/]",
          message:
            "Error() message must be localized or non-user-facing: pass i18n.t('…').",
        },
        {
          selector: "CallExpression[callee.name='Error'] > Literal[value=/[a-z]{3}/]",
          message:
            "Error() message must be localized or non-user-facing: pass i18n.t('…').",
        },
      ],
    },
  },
  {
    // Test fixtures construct fake ApiErrors with literal English as INPUT —
    // not user-facing copy (mirrors the copy gate's test exclusion).
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // httpError.ts builds the ENGLISH FALLBACK table by design — the client
    // localizes per request (see src/api/errorMessages.ts). Mirrors the copy
    // gate's allowlist for the same file.
    files: ['src/api/httpError.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
