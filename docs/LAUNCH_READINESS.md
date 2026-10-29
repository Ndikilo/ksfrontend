# Web and app-store launch readiness

Reviewed 2026-10-29 against the product source in Ndikilo/ksfrontend. The older
Documents/ChatGPT checkout is a separate web prototype; its demo-feature audit
must not be treated as the feature inventory of this product.

## Work completed

- Initial iOS build number and Android version code are configured.
- Android cleartext network traffic is disabled.
- EAS preview and production builds require an explicit HTTPS API domain.
  A missing setting can no longer silently select the temporary API IP.
- EAS production builds also require HTTPS Terms and Privacy URLs and a
  non-placeholder support email. Format validation does not prove owner approval
  or service availability.
- Terms and Privacy notices open the configured public URLs, with translated
  error feedback when opening fails. Approved URLs have not yet been supplied.
- The unused placeholder support constant now reads the build configuration.
- Updated follow-redirects 1.16.0 to 1.16.2, node-forge 1.4.0 to 1.4.2,
  undici 6.29.0 to 6.29.1, and brace-expansion 5.0.9 to 5.0.12.
- Overrode the Expo toolchain's PostCSS 8.4 dependency with patched 8.5.32
  within the same major version. All platform bundle exports pass with it.

## Verification

| Check | Result |
|---|---|
| Automated tests | 432 passed in 42 suites |
| Type checking | Passed |
| Translation/copy gate | Passed |
| Lint | No errors; 10 existing warnings |
| Web, Android and iOS bundle exports | Passed |
| Signed native builds and device QA | Not completed; account setup and launch inputs needed |
| Production hosting inspection | Render and Vercel connectors returned unavailable |

Jest reports an existing open-handle warning after tests finish; the process
exits successfully. Sentry export warns that organization/project are absent,
and the committed DSN is empty, so production error monitoring remains unverified.

## Dependency findings

The initial successful npm production-dependency audit reported 25 findings:
6 high, 9 moderate, 10 low, and no critical findings. The package updates above
address five of the six high-severity package entries from that report.
The successful audit after updates reports 1 high, 6 moderate, 19 low, and
no critical findings (26 total dependency entries, including toolchain packages).
The remaining known high entry is image-size 1.2.1, used by Metro when parsing
build assets. No patched 1.x version was listed by the npm registry. A forced
major override would change Metro's image parser interface and needs a separate
framework compatibility change. Only trusted repository assets should enter
the build pipeline pending that change. Other toolchain advisories still need
review; this release is not certified free of vulnerabilities.

## Inputs and checks still required before public patient enrollment

1. Confirm the owner-controlled production API domain, trusted TLS, deployed
   backend revision and APP_ENV=prod, migrations, access controls, and CORS for
   the actual web origin. The existing web configuration retains its temporary
   IP fallback until a build-time API setting is provided.
2. Supply approved Terms and Privacy documents/URLs, monitored support email,
   and an approved consent revision matching backend expectations. The frontend
   still submits consent version 1.0. Configure the four EXPO_PUBLIC variables
   listed in the README in EAS and Vercel, then rebuild.
3. Verify production email/SMS delivery, payment credentials and webhooks,
   storage and document scanning, backups/restore, and error monitoring.
4. Confirm Expo/EAS project ownership, Apple Developer and Google Play account
   access, signing credentials, store metadata, screenshots and privacy/data
   declarations. Confirm build number 1 has not already been used in either
   store; increment before upload if it has.
5. Run real-device and web smoke flows with designated test accounts:
   registration/OTP, login/reset, patient/practitioner authorization, booking,
   payment failure/retry/success, cancellation, document access and deletion.
   Bundle exports do not establish that these backend workflows work in production.

## Release and recovery

Push the same tested product commit to ksfrontend/main and the live web source
Ndikilo/kanasante main using ordinary fast-forward pushes. Do not overwrite a
diverged branch. Inspect CI for both repositories and the resulting web build.
The release has no database migrations. If the web build fails or login/booking
regresses, pause enrollment and revert the frontend release commits or restore
the previously verified web deployment at 5bf5232; preserve backend data.
Native binaries must pass internal device QA before store submission.
