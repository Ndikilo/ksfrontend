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
  never washes. Contrast is part of the token contract: status-colored copy on
  its `*Surface` tint must pass WCAG AA (4.5:1 text, 3:1 icons) in BOTH themes
  — where it doesn't (amber on amber100 in light mode fails at ~1.9:1), keep
  the status color for icon/border and set the copy in `colors.text`, or add a
  darker `*Text` token in `src/theme`.
- Spacing: the 4pt scale `spacing.none…huge` (`xxs`=2, `xs`=4, `sm`=8, `md`=12,
  `lg`=16, `xl`=24, `xxl`=32, `xxxl`=48, `huge`=64) and `layout.screenPadding`
  (24) / `layout.hitSlop` / `layout.maxContentWidth` (640) — no magic numbers.
  Touch targets ≥ 48×48 (use `hitSlop` for icon-only controls).
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
  global banner matches `Banner`, not its own size). No mixed families, no
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
  next action: "No appointments yet — find a practitioner").
- Every interactive element shows default / pressed (≤100ms feedback) /
  disabled / loading. No dead taps; no dead ends (always a way forward or back).
- Destructive actions confirm. After success the user lands somewhere useful —
  never a bare success screen.
- Lists are FlatList/sectionalized with `keyExtractor`; unbounded data
  paginates (cursor, like the API). Images have fixed dimensions.
- i18n: every user-facing string through `t()` (`src/i18n`, en + fr always both);
  no `allowFontScaling={false}`; layouts must survive ~+20% French expansion and
  OS font scaling. Errors say what happened + what to do next ("This slot was
  just taken. Pick another time."), never "Error 409".

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
