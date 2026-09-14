import axios from 'axios';

import type { ApiError, FieldErrorDetail } from '@/types';

/**
 * Convert any thrown value (Axios error, network failure, unknown) into a
 * predictable `ApiError`. The rest of the app only ever deals with this shape,
 * so screens can render `error.message` safely and inspect `error.status`.
 *
 * The backend has two error formats, both handled here:
 *   - `/v1/*` envelope: `{ error: { code, message, details }, requestId }`
 *   - `/api/auth/*` (better-auth): `{ message, code }` at the top level
 */
export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    // The request was made and the server responded with a non-2xx status.
    if (error.response) {
      const { status, data } = error.response;
      return fromResponseBody(status, data);
    }
    // The request was made but no response was received (offline/timeout).
    if (error.request) {
      return {
        status: 0,
        message: 'Network error. Please check your connection and try again.',
        code: error.code,
      };
    }
  }

  return { status: 0, message: 'Something went wrong. Please try again.' };
}

function fromResponseBody(status: number, data: unknown): ApiError {
  const body = (data ?? {}) as Record<string, unknown>;

  // Feature-API envelope: { error: { code, message, details }, requestId }.
  const envelope = body.error;
  if (typeof envelope === 'object' && envelope !== null) {
    const { code, message, details } = envelope as Record<string, unknown>;
    return {
      status,
      message:
        (typeof message === 'string' && message) || defaultMessageForStatus(status),
      code: typeof code === 'string' ? code : undefined,
      fieldErrors: toFieldErrors(details),
    };
  }

  // better-auth: { message, code } at the top level.
  return {
    status,
    message: (typeof body.message === 'string' && body.message) || defaultMessageForStatus(status),
    code: typeof body.code === 'string' ? body.code : undefined,
  };
}

/** Flatten the 422 `details` array into a `{ field: message }` map. */
function toFieldErrors(details: unknown): Record<string, string> | undefined {
  if (!Array.isArray(details)) return undefined;
  const errors: Record<string, string> = {};
  for (const detail of details) {
    if (typeof detail !== 'object' || detail === null) continue;
    const { path, message } = detail as Partial<FieldErrorDetail>;
    if (typeof path === 'string' && path && typeof message === 'string' && message) {
      errors[path] ??= message;
    }
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'The request was invalid.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 413:
      return 'That file or request is too large.';
    case 422:
      return 'Please check the highlighted fields and try again.';
    case 429:
      return 'Too many requests. Please slow down and try again.';
    default:
      return status >= 500
        ? 'Our servers are having trouble. Please try again shortly.'
        : 'Something went wrong. Please try again.';
  }
}

/** Type guard so callers can `catch (e) { if (isApiError(e)) ... }`. */
export const isApiError = (value: unknown): value is ApiError =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  'message' in value;

/** Build an `ApiError` for client-side flow failures (no network involved). */
export const apiError = (status: number, message: string, code?: string): ApiError => ({
  status,
  message,
  code,
});
