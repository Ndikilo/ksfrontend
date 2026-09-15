/**
 * Icon mapping for professions/specialties, resolved from the backend's
 * profession name (nameEn/nameFr). Purely presentational — a missing match
 * falls back to the generic care icon.
 */
const MATCHERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/dentist|dental|dentaire/i, '🦷'],
  [/cardio/i, '🫀'],
  [/ophthal|eye|ophtal/i, '👁️'],
  [/dermat|skin|peau/i, '🧴'],
  [/pediatric|paediatric|enfant/i, '🧒'],
  [/midwife|midwif|sage-femme|matern/i, '🤰'],
  [/surgeon|chirurg/i, '⚕️'],
  [/nurse|infirm/i, '💉'],
  [/doctor|physician|general|général|médecin/i, '🩺'],
];

export const FALLBACK_PROFESSION_ICON = '🩺';

/** Best-effort emoji for a profession/specialty label (e.g. "Dentist" → 🦷). */
export function professionIcon(...labels: ReadonlyArray<string | null | undefined>): string {
  const haystack = labels.filter(Boolean).join(' ');
  for (const [pattern, icon] of MATCHERS) {
    if (pattern.test(haystack)) return icon;
  }
  return FALLBACK_PROFESSION_ICON;
}
