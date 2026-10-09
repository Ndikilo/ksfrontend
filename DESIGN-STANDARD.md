# KanaSante Design Standard

The quality bar every UI-bearing change is reviewed against (by the `ui-quality`
agent — verdicts PASS / PASS-WITH-NOTES / FAIL gate task completion).
KanaSante: healthcare booking for Cameroon's diaspora; patients book and pay for
dependents back home. Expo SDK 54 · RN 0.81 · expo-router · en/fr.
Canonical copy of this file lives at the workspace root; `kanasante/DESIGN-STANDARD.md`
is the committed twin — keep them identical.

## 1. Token discipline (BLOCKER = any hardcoded hex/px outside `src/theme`)

- Colors: only semantic roles from `src/theme/colors.ts` via `useTheme()` —
  `colors.background / surface / surfaceAlt / overlay`, `colors.text / textMuted /
  textInverted`, `colors.primary / primaryMuted / onPrimary`,
  `colors.border / borderStrong`, `colors.danger / success / warning / info` (+
  their `*Surface` tints). Raw `palette.*` is for `src/theme` only. Status
  colors mean exactly one thing each; brand blue is for CTAs and key accents,
  never washes. Contrast is part of the token contract: status-colored copy —
  on its `*Surface` tint or on any plain surface — must pass WCAG AA (4.5:1
  text, 3:1 icons) in BOTH themes. Where it doesn't (amber on amber100 in
  light mode fails at ~1.9:1; red500 on white is only 3.9:1), keep the status
  color for icon/border and set the copy in `colors.text`, or add a `*Text`
  token in `src/theme` — darker than the status color in light mode, lighter
  in dark mode (dark danger/info on their tints also fail at 3.9/3.2:1).
- Spacing: the 4pt scale `spacing.none…huge` (`xxs`=2, `xs`=4, `sm`=8, `md`=12,
  `lg`=16, `xl`=24, `xxl`=32, `xxxl`=48, `huge`=64) and `layout.screenPadding`
  (24) / `layout.hitSlop` / `layout.minTouchTarget` (48) /
  `layout.maxContentWidth` (640) — no magic numbers. Inline styles always
  reference the tokens (`theme.spacing.*`); static `StyleSheet.create` blocks
  may use ON-SCALE numeric literals (they cannot read the hook) — any
  off-scale value is a magic number. Touch targets ≥ 48×48 (use `hitSlop` for
  icon-only controls).
- Radius: `radius.control` (5) for ALL interactive controls (Button, Input,
  Select, DateField — already shared), `sm/md/lg` for cards, `xl` (20) for
  sheet top corners (see `Select`), `full` for pills and avatars. One radius
  story per surface; no rounded-everything.
- Elevation: `shadows.none/sm/md/lg` presets only, spread onto surfaces.
  Prefer borders (`colors.border`) over shadows for static structure; shadow-soup fails.
- Typography: ONLY the 8 variants via `<Text variant="…">` — `display`, `title`,
  `heading`, `subheading`, `body`, `bodyStrong`, `caption`, `label`. Max ~6
  distinct variants per screen; hierarchy by variant, never by ad-hoc size.
- Dark mode is automatic through tokens — any literal color breaks it → BLOCKER.
- Icons: `Ionicons` from `@expo/vector-icons` (the only family; outline variant
  for inactive tab states). Glyph sizes: 20 standard, 22 in large controls —
  one size per context, never a smaller one-off for a sibling component (a
  global banner matches `Banner`, not its own size). EmptyState icons: 48,
  everywhere (not 40/44/56 per screen). No mixed families, no
  AI-generated imagery; brand assets come from `assets/` (`<Logo>`,
  `<Watermark>`).

## 2. Components (compose; never re-style)

- Screens compose ONLY primitives from `src/components/ui` (Avatar, Badge,
  Button, Card, Checkbox, DateField, Divider, FieldLabel, IconButton, Input,
  Link, OtpInput, PageIndicator, Screen, Select, Spinner, Text) and feedback
  from `src/components/feedback` (Banner, EmptyState, ErrorState, ErrorBoundary,
  OfflineBanner), brand from `src/components/brand`. No raw `Text`/`View` +
  inline style clusters.
- A new component must either join `src/components/ui` (reusable, tokenized) or
  be explicitly justified in review — one-off styled clusters in a screen = BLOCKER.
- Every async surface has all three states from the kit: loading (`Spinner` or
  skeleton matching the final layout shape — no generic pulse box), error
  (`ErrorState` with retry), empty (`EmptyState` that explains why + offers the
  next action: "No appointments yet — find a practitioner"). A refetch of
  already-visible data (focus refresh, post-mutation refresh, retry) keeps the
  content mounted (stale-while-revalidate); the full-screen `Spinner` branch is
  first load only — gate it on `isLoading && data === null`, never a bare
  `isLoading`. A refocus/retry refetch that FAILS while stale content stays
  mounted surfaces a `Banner` (the patient appointments-tab pattern) — never a
  silent failure the user can't distinguish from fresh data.
- Every interactive element shows default / pressed (≤100ms feedback) /
  disabled / loading. No dead taps; no dead ends (always a way forward or back).
- Destructive actions confirm. After success the user lands somewhere useful —
  never a bare success screen.
- Lists are FlatList/sectionalized with `keyExtractor`; unbounded data
  paginates (cursor, like the API). Images have fixed dimensions.
- Role-aware shells: which tab group a session lands on is decided by ONE
  pure role→route table (`src/store/roles.ts`) consumed by every guard
  (splash, auth redirect, both group layouts — no guard reimplements the
  predicate). A signed-in deep-return `redirect` param must never override
  role routing into the other role's flow, and any route outside both
  groups that only one role may use (e.g. booking/checkout) carries its own
  role guard. Persona data: a practitioner surface shows WHO each row
  belongs to (patient name leads the row and its a11y label) — a nameless
  agenda fails the Doctolib/Zocdoc benchmark.
- i18n: every user-facing string through `t()` (`src/i18n`, en + fr always both);
  no `allowFontScaling={false}`; layouts must survive ~+20% French expansion and
  OS font scaling. Interpolated keys (`{{param}}`) must receive every param at
  EVERY call site — a missing param renders the literal `{{param}}` to the user
  (i18next does not blank it); when parameterizing or renaming a key, grep all
  `t('key…')` call sites. Errors say what happened + what to do next ("This
  slot was just taken. Pick another time."), never "Error 409".
- Money-adjacent terms are committed with their ACTUAL numbers before the user
  commits: the confirm step states the real cancellation notice window and fee
  (from the practitioner's policy), never "details shown after booking".
- Money flows (checkout, receipts) have an honesty bar of their own: receipt
  rows render from the PAYMENT record (amount, rail, paid-at, receipt number),
  never from a possibly-stale sibling; "due" vs "paid" labels match the charge
  status; a poll loop spins only while it is actually polling — at the cap,
  stop the spinner and say so (an infinite spinner over a stopped loop is a
  banned state), and every handler that clears the exhausted flag must also
  RESTART the loop (re-kick the chain) — clearing the flag alone re-creates
  the banned spinner-over-stopped-loop state; a resumed charge must never
  interpolate state the record
  doesn't carry (empty `{{param}}` renders as "sent to ."); and payment
  success/failure must be ANNOUNCED (`AccessibilityInfo.announceForAccessibility`
  / `accessibilityLiveRegion`, as `OfflineBanner` already does), not only shown.
- Error-recovery controls (retry, load-more retry) must actually RE-ISSUE the
  failed request — a handler that only clears the error flag through a stale
  closure is a dead tap (guard state read from the old render's callback).
  A retry/refetch test must pin a NEW call (`toHaveBeenCalledTimes(n+1)` or
  similar), never `toHaveBeenCalledWith` alone — that matcher matches earlier
  calls already in the mock's history and passes vacuously.

## 3. Copy (no AI slop)

| Concept | Use | Avoid |
|---------|-----|-------|
| Clinician (data/clinical contexts, roles, lists) | practitioner | doctor, provider, medic (generic) |
| Clinician (casual booking copy only) | doctor acceptable | "healthcare professional" |
| The person booking | you (direct address) | user, patient (UI copy) |
| Care recipient | dependent (data), "the person you care for" (explainer copy) | ward, beneficiary |
| Payment | mobile money, MoMo, Orange Money | e-payment, digital wallet |
| Actions | Book, Confirm, Cancel, Resend code | Reserve, Finalize, Transact |

- Sentence case everywhere. No emoji in buttons/titles/errors (the greeting 👋
  is a product decision — keep it only there). No exclamation stacking. No fake
  stats ("10,000+ doctors"), no lorem, no TODO copy.
- BANNED verbatim slop: "Welcome to the future of healthcare", "Seamless
  experience", "Unlock …", "Empowering …", "Your health, simplified", any line
  that could ship unedited on 10,000 other apps. If it reads like template
  marketing, rewrite it for THIS product (families, dependents back home, trust).
- French is native-quality, formal `vous`, same tone — never word-by-word
  translation. Both locales read like a local product.

## 4. Benchmarks (patterns must have top-tier precedent)

Name the benchmark when justifying a pattern: **Airbnb** (search, availability
pickers, booking flow), **Zocdoc / Doctolib / Oscar Health** (practitioner
discovery, appointments), **Monzo / Revolut** (payment states, receipts),
**Apple Health / Google Fit** (health-record surfaces). If the only precedent is
tutorial code, it fails. Homepage follows the Homepage PRD (greeting →
quick-category chips → doctors-near-you carousel → health tips) at
Airbnb-level polish — NOT a gradient-header SaaS dashboard.

## 5. Feasibility (low-end Android over 3G is the market)

- New dependency = justified against existing deps in review; heavy libs (maps,
  video, charts) need bundle-size reasoning. No blur/heavy-shadow/animated-
  gradient decoration; no animation that carries no information.
- 3G manners: no full-res assets for thumbnails, skeletons instead of spinners
  on long fetches, offline drop mid-flow → retryable `ErrorState`/`Banner`,
  never a crash or infinite spin.
- Times are clinic-local, not device-local: slot chips, day grouping, and
  confirm/success summaries render in the clinic timezone (`Africa/Douala` —
  fixed offset, no DST) via a shared `Intl` formatter with an explicit
  `timeZone`; the core persona books across timezones for dependents back
  home, and a Paris device must never see Douala appointments in Paris time.
- Gestures/sheets: dismissal always available (back gesture included); no
  modal-on-modal-on-modal; keyboard never covers the focused input; return-key
  type matches the next action.
- Global chrome mounted above the router (OfflineBanner-style bars) applies the
  top safe-area inset itself (`useSafeAreaInsets` / `SafeAreaView edges=['top']`)
  — SDK 54 Android is edge-to-edge by default and iOS draws under the status
  bar; nothing user-facing renders at y=0.

## 6. Verdicts & device checks

Reviewer walks sections 1–5 with file:line evidence and severity
(BLOCKER / MAJOR / MINOR). Verdicts: `PASS` · `PASS-WITH-NOTES` (only MINORs) ·
`FAIL` (any BLOCKER/MAJOR — must list concrete fixes). Anything only verifiable
on hardware (gesture feel, keyboard timing) is listed under `DEVICE-CHECK:` and
tracked in the user-action registry before store submission.

## 7. Window honesty, form preservation, format locale, nav-chip scaling (Review 013)

- Window honesty: a filtered view over a paginated window never asserts
  absence unless the window provably covers the filter — fetch-to-coverage
  (keep cursor-fetching until the loaded range spans the filter) or scoped
  empty copy. Keyset pages are contiguous, so "oldest loaded row is past the
  filter's lower bound" (or an exhausted cursor) is the exact coverage test;
  an empty state inside a 50-row window is a factual claim, and a refocus
  refetch must re-run the coverage fetch so the gap cannot re-open.
- Form-failure preservation: closing a form must never destroy unsaved input
  while its save is in flight. On failure the draft returns to the user
  prefilled, with the error Banner rendered INSIDE the form (VerificationCard's
  kept-file-with-Retry is the reference pattern); the draft clears on success
  only.
- Format locale: every `Intl` formatter takes `i18n.language` explicitly —
  the device locale applies only where the user has not chosen in-app.
  Locale grammar (list conjunctions) goes through `Intl` with that same
  explicit locale, never hand-built separators.
- Nav-chip scaling: primary navigation chips (segment tabs) survive OS font
  scaling × French expansion — a 2-line clamp (`numberOfLines={2}`) or
  shorter labels; `numberOfLines={1}` is for secondary chips only. Growing a
  pill's line count is safe: its touch target is a `minHeight`, so the
  container auto-heightens instead of clipping.

## 8. Recorded deferrals, extraction re-review, teaser timezone, shadow primitives (Review 014)

- Recorded-deferral rule: an acceptance-named interaction path may not be
  silently replaced by a weaker one; deferral requires a PLAN/PROGRESS scope
  decision naming the shipped substitute.
- Extraction re-review rule: moving code into a shared kit component
  re-subjects it to the standard in full — inherited violations are fixed at
  extraction, not promoted into kit furniture.
- Teaser timezone rule: any rendered instant a patient can plan around
  (availability teasers, discovery cards) is clinic-local, not only booking
  flows.
- Shadow-primitive rule: a screen-local component named after a kit primitive
  is a §2 violation by definition; extend the kit instead.
