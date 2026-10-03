import * as Sentry from '@sentry/react-native';

import { env } from '@/config/env';

import { logger } from './logger';

/**
 * Error reporting (Sentry) via @sentry/react-native's Expo integration.
 *
 * Disabled entirely until a DSN is configured (`expo.extra.sentryDsn` in
 * app.json — a DSN is a public ingest URL, not a secret). Without it, init is
 * skipped and every report degrades to a local `logger.error`. Create the
 * Sentry project (mobile), then paste its DSN — see README → Error reporting.
 *
 * Global handlers (uncaught JS errors and rejections) are wired by Sentry.init
 * itself; render crashes flow through our ErrorBoundary → reportError below.
 */
export function initSentry() {
  if (env.sentryDsn === '') return;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.isDev ? 'development' : 'production',
    // Error tracking only — performance tracing stays off for now.
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

/** Report an error to Sentry (when configured) and always to the local log. */
export function reportError(error: unknown, context?: { componentStack?: string | null }) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error('sentry', message, context?.componentStack ?? undefined);
  if (env.sentryDsn === '') return;
  Sentry.captureException(
    error,
    context?.componentStack === undefined || context.componentStack === null
      ? undefined
      : { extra: { componentStack: context.componentStack } },
  );
}
