import { env } from '@/config/env';

/**
 * Thin logging wrapper. In dev it prints to the console; in production it is a
 * no-op for debug/info (swap in Sentry/Crashlytics for `error` here later).
 * Using this instead of raw `console.*` gives one seam to control app logging.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

function write(level: Level, scope: string, message: string, meta?: unknown) {
  if (!env.isDev && (level === 'debug' || level === 'info')) return;
  const tag = `[${scope}]`;
  const args = meta === undefined ? [tag, message] : [tag, message, meta];
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](...args);
}

export const logger = {
  debug: (scope: string, message: string, meta?: unknown) => write('debug', scope, message, meta),
  info: (scope: string, message: string, meta?: unknown) => write('info', scope, message, meta),
  warn: (scope: string, message: string, meta?: unknown) => write('warn', scope, message, meta),
  error: (scope: string, message: string, meta?: unknown) => write('error', scope, message, meta),
};
