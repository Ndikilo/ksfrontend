# Kana Sante — Mobile

A React Native (Expo) app built for **modularity, reuse, and clean separation of
concerns**. UIs are composed from a themed component library; backend
integration goes through a single, typed API layer.

- **Expo SDK 54** · React Native 0.81 · React 19 · TypeScript (strict)
- **expo-router** — file-based, typed navigation
- **axios** — one configured HTTP client with interceptors
- **expo-secure-store** — secure token storage

## Getting started

```bash
npm install
npm run ios      # or: npm run android / npm run web
npm run typecheck
```

Set your backend URL in [`app.json`](app.json) under `expo.extra.apiBaseUrl`
(read in a typed, single place via [`src/config/env.ts`](src/config/env.ts)).

## Project structure

Routing lives in `app/` (expo-router); all reusable logic lives in `src/`,
imported through the `@/` alias (e.g. `import { Button } from '@/components/ui'`).

```
app/                      # Screens & navigation (file-based routes only)
  _layout.tsx             # Root: providers + navigator (holds native splash)
  index.tsx               # Branded splash → routes by language + auth state
  (onboarding)/           # First-run flow → language selection
  (auth)/                 # Signed-out group  → login
  (tabs)/                 # Signed-in group   → home, profile
  +not-found.tsx

src/
  api/                    # ← Backend integration lives here
    client.ts             #   axios instance + auth/error interceptors + typed `http` facade
    endpoints.ts          #   single source of truth for every URL path
    httpError.ts          #   normalises any failure into a typed `ApiError`
    services/             #   per-domain functions (auth, account, reference)
  components/
    ui/                   # Primitives: Text, Button, IconButton, Link, Input, Select,
                          #   Checkbox, OtpInput, DateField, Card, Screen, Badge,
                          #   Avatar, PageIndicator, FieldLabel…
    feedback/             # EmptyState, ErrorState, ErrorBoundary, Banner
    brand/                # Logo, Watermark (brand-specific visuals)
    auth/                 # AuthScaffold, AuthHeader, AuthPrompt, TermsNotice
  theme/                  # Design tokens: colors, spacing, radius, typography, shadows
                          #   + ThemeProvider / useTheme (light & dark)
  hooks/                  # useAsync, useMutation, useCarousel, useCountdown…
  i18n/                   # i18next setup + en/fr locale resources
  store/                  # Global state (AuthContext)
  config/                 # Typed runtime config (env)
  constants/              # StorageKeys, AppConfig
  types/                  # Shared API & domain types
  utils/                  # logger, secure storage, validators, formatters
  providers/              # AppProviders — composes all global providers
```

## The two things you asked for

### 1. Reusable UIs (DRY + one design system)

Every visual value — color, spacing, font, radius, shadow — is a **token** in
`src/theme`. Components read tokens via `useTheme()`; **nothing hard-codes a hex
or a magic number**. Change a token once, the whole app updates (including dark
mode, which is automatic).

Screens are composed only from primitives in `@/components` — never raw
`<Text>`/`<View>` with inline styles:

```tsx
import { Screen, Card, Text, Button, Badge } from '@/components/ui';

export default function Example() {
  return (
    <Screen>
      <Card>
        <Text variant="subheading">Next appointment</Text>
        <Badge label="Scheduled" tone="success" />
        <Button title="Reschedule" variant="outline" onPress={reschedule} />
      </Card>
    </Screen>
  );
}
```

To add a component, drop it in `src/components/ui`, build it from theme tokens,
and export it from the barrel `index.ts`.

#### Reusable `<Select>`

A generic, typed dropdown lives in `src/components/ui/Select.tsx`. Pass any
option list and it returns the chosen value (fully typed) through `onChange` —
reuse it for languages, roles, filters, anything:

```tsx
import { Select } from '@/components/ui';

<Select<LanguageCode>
  label="Language"
  value={language}
  onChange={setLanguage}
  options={LANGUAGES.map((l) => ({ label: l.label, value: l.code }))}
/>
```

It renders a labelled trigger with a chevron and opens a themed bottom-sheet
picker (with the current choice checked). Supports `placeholder`, `error`,
`disabled`, per-option `description`, and a custom sheet `title`.

#### Carousel / onboarding

The onboarding screen (`app/(onboarding)/onboarding.tsx`) is a swipeable,
auto-advancing (3s) carousel. The paging + autoplay + pause-on-touch logic is a
reusable hook, `useCarousel`, so any future carousel is a few lines. The active
dot uses the reusable `<PageIndicator>`; the CTAs are the shared `<Button>` /
`<Link>` primitives.

#### Authentication flow

Full flow under `app/(auth)/`, built from the reusable field/auth components:

```
register (profile) → register-password → verify-otp ─┐
                                                      ├─ signs in → tabs
login ────────────────────────────────────────────────┘
login → forgot-password → verify-otp → reset-password → login (success banner)
```

- `verify-otp` is a single screen reused for both registration and reset (the
  `purpose` param drives copy + what happens on success). Its resend timer uses
  the `useCountdown` hook; the code entry is the reusable `<OtpInput>`.
- Password rules ("≥8 chars, a letter and a number") and the match check live in
  `utils/validators`, so register and reset validate identically.
- The API lives in `api/services/auth.service.ts` and talks to the real
  **better-auth** endpoints under `/api/auth/*`. **Dev mock:** if you need to
  walk the UI without a server, set `"mockAuth": true` in `app.json > extra` —
  any 6-digit code verifies except `000000` (error-state demo), and signing in
  as `unverified@example.com` exercises the email-verification detour.

## Connecting to the ksbackend API

The app targets the [ksbackend](https://github.com/Allen-Brian/ksbackend) API
(Hono + better-auth + Postgres). Bearer tokens obtained at sign-in/sign-up are
attached to every `/v1/*` request; sessions are re-validated against
`/api/auth/get-session` on cold start (an offline device keeps its session; a
revoked one is cleared).

**Hosted (recommended for device testing):** a one-click Render deployment of
the API exists on the backend fork — open
<https://render.com/deploy?repo=https://github.com/Ndikilo/ksbackend>, sign in
with GitHub, and Render provisions the API + Postgres (free tier, staging
configuration, migrations run automatically). See the backend's
`docs/deploy-render.md` for OTP email setup and seeding. Then set
`expo.extra.apiBaseUrl` in `app.json` to your `https://<app>.onrender.com` URL.

1. **Run the backend locally** (from the `ksbackend` repo — needs Bun + Docker):
   ```bash
   bun run setup   # deps, .env.local, Postgres, env validation
   bun run dev     # API on http://localhost:5000
   ```
   Set `DEMO_PRACTITIONER_EMAIL` and run `bun run db:seed` to create reference
   data (professions, languages, demo practitioner). Outgoing email uses Resend —
   see the backend's `docs/local-dev.md`; the OTP codes arrive there.

2. **Point the app at it** — `app.json > expo.extra.apiBaseUrl` defaults to
   `http://localhost:5000` (the backend's default port). On the **Android
   emulator** `localhost` is automatically rewritten to `10.0.2.2`; on a
   **physical device** use your machine's LAN IP instead.

3. **Web note** — the backend's CORS allow-list (`CORS_ORIGINS` env var) must
   include the Expo web dev origin (e.g. `http://localhost:8081`). Native
   iOS/Android requests are not subject to CORS.

Flow specifics worth knowing:

- **Register** creates the account (`sign-up/email`, which emails a 6-digit
  OTP), the app verifies the code (`email-otp/verify-email`), then signs in
  with the just-created credentials to get the bearer session, and finally
  completes the patient profile (`POST /v1/patients/me/profile`, idempotent) —
  which is also what claims the `patient` role.
- **Sign-in before verifying** is blocked by the backend with
  `403 EMAIL_NOT_VERIFIED`; the app intercepts that, re-sends the OTP and routes
  into the verification screen, which signs straight in on success.
- **Password reset** uses the email-OTP plugin: request code → enter code →
  reset with `{email, otp, password}` (validated server-side in that last call).
- The app's language choice is sent at sign-up (`locale` field) and mirrored to
  `PATCH /v1/me` whenever it changes while signed in, so backend emails match.

#### Internationalization (English + French)

Powered by `i18next` + `react-i18next`, set up in `src/i18n`:

- **English** (`locales/en.ts`) is the source of truth; **French** (`locales/fr.ts`)
  is type-checked against its shape, so a missing key is a compile error.
- The **initial language is deduced from the device/OS** (`expo-localization`),
  narrowed to a supported code. A saved preference (from the language screen)
  overrides it on the next launch.
- Read copy with the standard hook and change language app-wide via a helper:

  ```tsx
  const { t } = useTranslation();
  <Text>{t('login.title')}</Text>

  import { changeAppLanguage } from '@/i18n';
  await changeAppLanguage('fr'); // switches everything + persists
  ```

To add a language: add its resource file, register it in `src/i18n/index.ts`
(`resources` + `SUPPORTED`), and add it to `LANGUAGES` in `src/constants`.

#### App flow

`splash (app/index.tsx) → language select (first run) → onboarding → auth →
tabs`. The splash reads the saved language + auth session and routes accordingly
(language selection only appears once).

### 2. One place for backend/API functions

All backend calls go through `src/api`. You **never** call `axios` or write a URL
in a screen. Instead:

1. Add the path to [`endpoints.ts`](src/api/endpoints.ts).
2. Add a typed function to a service in [`services/`](src/api/services).
3. Call it from a screen with a hook.

```tsx
import { referenceService } from '@/api';
import { useAsync } from '@/hooks';
import { Spinner, EmptyState, ErrorState } from '@/components';

function Professions() {
  const { data, error, isLoading, refetch } = useAsync(() => referenceService.professions());

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data?.data.length) return <EmptyState title="Nothing here yet" />;
  // render data.data …
}
```

For actions (submit/save/delete) use `useMutation`:

```tsx
const { mutate, isLoading } = useMutation(authService.login, {
  onSuccess: (session) => signIn(session),
});
```

The client automatically attaches the auth token, times out, and converts every
failure into a friendly `ApiError` — so screens only handle one error shape. A
`401` triggers a global sign-out via the registered handler.

## Principles this codebase follows

- **DRY** — tokens, `endpoints`, `StorageKeys`, and shared hooks mean one source
  of truth for each concern.
- **SRP** — transport (`client`), URLs (`endpoints`), error shape (`httpError`),
  and business calls (`services`) are separate files; UI never mixes with fetching.
- **Typed end to end** — strict TypeScript; API inputs/outputs are typed in `src/types`.
- **Barrel exports** — import from a module (`@/components`, `@/api`, `@/theme`),
  not deep file paths.
- **Fail soft** — secure storage and logout degrade gracefully; an `ErrorBoundary`
  catches render crashes.

## Conventions

- Import via the `@/` alias, not relative `../../` chains.
- New screen → add a file under `app/`. New shared logic → add under `src/` and
  export from the module barrel.
- Keep secrets out of the repo; use EAS environment variables for real builds.

## Verify

```bash
npm run typecheck                 # strict TS, no errors
npx expo-doctor                   # config/dependency health (20/20)
npx expo export --platform ios    # confirm the bundle builds
```

## Error reporting (Sentry)

Crash + error reporting is wired but **disabled until a DSN is configured** —
without one the app runs identically, reports degrade to the local log.

Setup (human, once):

1. Create a Sentry project for the mobile app ([sentry.io](https://sentry.io)),
   note its **DSN** and the org/project slugs.
2. Paste the DSN into [`app.json`](app.json) under `expo.extra.sentryDsn`
   (a DSN is a public ingest URL, not a secret). Overridable per build profile
   via EAS environment variables later.
3. For EAS builds, add the secrets so source maps upload automatically
   (org/project slugs feed the plugin; the token needs `project:write`):
   ```bash
   eas secret:create --name SENTRY_AUTH_TOKEN --value <token>
   eas secret:create --name SENTRY_ORG --value <your-org-slug>
   eas secret:create --name SENTRY_PROJECT --value <your-project-slug>
   ```
   Locally, put them in `.env.local` instead. Never commit them.

What reports: render crashes (root `ErrorBoundary` → `reportError`), uncaught
JS errors and rejections (Sentry global handlers, installed by
`Sentry.init` in [`app/_layout.tsx`](app/_layout.tsx)).

Verify on a dev build (`development` profile):

```ts
Sentry.captureException(new Error('kanasante test event'));
```

The event appears in the Sentry dashboard within ~30s. Production stack traces
symbolicate automatically: the `@sentry/react-native/expo` config plugin +
[`metro.config.js`](metro.config.js) upload source maps during every
`eas build` (release builds only). For `eas update` / `expo export` bundles,
upload manually: `npx sentry-expo-upload-sourcemaps dist`.

## Versioning & build numbers

- `expo.version` in [`app.json`](app.json) is user-facing semver (1.0.0).
- `expo.ios.buildNumber` — string, bumped every TestFlight/App Store build.
- `expo.android.versionCode` — integer, monotonic: `major*10000 + minor*100 +
  patch` (1.2.3 → 10203). Never reuse or go backwards per store rules.
- Release tags cut from `main`; both fields bump in the same PR.

## Build profiles (EAS)

[`eas.json`](eas.json) defines `development` (dev client, local API),
`preview` (internal distribution, staging API), and `production`. Each profile
sets `EXPO_PUBLIC_API_BASE_URL`, which [`src/config/env.ts`](src/config/env.ts)
prefers over `app.json > expo.extra.apiBaseUrl`, so one config serves every
environment. Validate a profile without building:
`eas build --profile production --platform android --local` (requires `eas login`).

## Over-the-air updates (expo-updates)

JS-only fixes ship without a store release via
[expo-updates](https://docs.expo.dev/eas-update/introduction):

- `expo.runtimeVersion` uses the `appVersion` policy: an OTA bundle only loads
  on installs of the `expo.version` it was published for. **Any change to
  native modules or config plugins needs a store build, not an OTA update** —
  bump `expo.version` in the same PR as those changes so bundles stay matched.
- Each EAS profile has an EAS Update `channel` (development / preview /
  production). Publish with `eas update --profile <profile> -m "<message>"`.
- The app checks silently on launch and every foreground (throttled to one
  call per 15 min; [`src/hooks/useUpdateCheck.ts`](src/hooks/useUpdateCheck.ts)
  → [`src/utils/updates.ts`](src/utils/updates.ts)). A downloaded bundle
  applies on the **next cold start** — never an in-session reload, so an
  active booking or payment can't be interrupted.
- Until configured, everything is dormant: `Updates.isEnabled` is false and
  the checks no-op.

Setup (human, once, requires the Expo account from the EAS profiles step):

```bash
npx eas update:configure   # sets expo.updates.url + expo.extra.eas.projectId
eas update --profile production -m "first OTA bundle"   # sanity publish
```

Verify on a device: open the production build, background/foreground it after
publishing, force-quit, relaunch — the new bundle is live (check
`Updates.currentlyRunning` via a debug screen if unsure).

