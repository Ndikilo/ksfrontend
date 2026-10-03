#!/usr/bin/env node
/**
 * Copy gate: no hardcoded user-facing English outside the locale tables.
 *
 * All strings a user can see must come from `src/i18n/locales/{en,fr}.ts` via
 * `t(...)` (DESIGN-STANDARD.md copy rules — French users must never see raw
 * English). This script greps app/ + src/ for copy-shaped literals that bypass
 * i18n and fails the run when it finds any.
 *
 * Patterns flagged:
 *   1. Copy-bearing string props/keys: title=|label=|placeholder=|message=|
 *      subtitle=|hint=|text=|actionLabel=|accessibilityLabel= with a literal
 *      containing letters (both JSX `prop="x"` and object `{ prop: 'x' }`
 *      shapes). Comment lines are ignored; single-token placeholder values
 *      (example data such as "johndoe@gmail.com") are exempt.
 *   2. Raw JSX text children containing a word (≥3 letters) — .tsx only.
 *
 * File allowlist (justified — no translatable copy):
 *   - src/api/httpError.ts       English fallback messages by design; the
 *      client localizes them per request (see api/errorMessages.ts).
 *   - src/constants/languages.ts language ENDONYMS ("English", "Français") —
 *      intentionally shown in their own language, never translated.
 *
 * Directory/file exclusions (no user-facing copy):
 *   - src/i18n contents        the locale tables themselves + setup
 *   - test directories/files   test fixtures/assertions
 *   - src/api/services/auth.mock.ts   dev-only mock (forced off in release)
 *   - src/utils/validators.ts         pure helpers; see the file header — the
 *      boolean predicates take localized copy from their call sites, and the
 *      unconsumed `rules` factory's English defaults exist only for the pure
 *      unit tests (any real call site must pass localized messages).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['app', 'src'];
const EXCLUDE_DIRS = new Set(['node_modules', '.expo', '.git', 'i18n', '__tests__']);
const EXCLUDE_FILES = new Set([
  'auth.mock.ts', // dev-only mock service (release builds force mockAuth off)
  'validators.ts', // pure helpers — see header note + the allowlist rationale above
]);
const ALLOWED_FILES = new Set([
  'src/api/httpError.ts',
  'src/constants/languages.ts',
]);

const PROP_RE =
  /\b(?:title|label|placeholder|message|subtitle|hint|text|actionLabel|accessibilityLabel)\s*[:=]\s*["']([^"'\n]*)["']/g;
// Natural-language children only (≥2 words) — single tokens also match type
// annotations like `Promise<void>` in .tsx files.
const CHILD_RE = />([^<>{}\n]*[A-Za-z]{3,}[^<>{}\n]*)</g;
const NATURAL_CHILD_RE = /\S\s+\S/;
const hasLetters = (s) => /[A-Za-z]{2}/.test(s);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry)) yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      if (!EXCLUDE_FILES.has(entry)) yield full;
    }
  }
}

const isCommentLine = (line) => {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('/*') || t.startsWith('//');
};

const findings = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const normalized = relative('.', file).replace(/\\/g, '/');
    if (ALLOWED_FILES.has(normalized)) continue;
    const isTsx = file.endsWith('.tsx');
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      for (const match of line.matchAll(PROP_RE)) {
        const value = match[1];
        if (!hasLetters(value)) continue;
        // Example placeholder values (emails, first names) are data, not copy.
        if (match[0].startsWith('placeholder') && !/\s/.test(value)) continue;
        findings.push(`${relative('.', file)}:${i + 1}: prop copy "${value.trim()}"`);
      }
      if (isTsx) {
        for (const match of line.matchAll(CHILD_RE)) {
          const text = match[1].trim();
          if (text && NATURAL_CHILD_RE.test(text)) {
            findings.push(`${relative('.', file)}:${i + 1}: JSX text "${text}"`);
          }
        }
      }
    });
  }
}

if (findings.length > 0) {
  console.error(
    `✖ copy gate: ${findings.length} hardcoded user-facing string(s) outside locales — move them to src/i18n/locales and render via t():\n\n` +
      findings.map((f) => `  ${f}`).join('\n'),
  );
  process.exit(1);
}
console.log('copy gate: no hardcoded user-facing strings outside locales ✔');
