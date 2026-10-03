import { apiError, isApiError, normalizeError } from '../httpError';

/**
 * Build a minimal object `axios.isAxiosError` recognises, without spinning up
 * a real HTTP round-trip. `normalizeError` only reads `isAxiosError`,
 * `response` and `request`, so a plain object is a faithful stand-in.
 */
const axiosError = (partial: {
  response?: { status: number; data: unknown };
  request?: unknown;
  code?: string;
}): unknown => ({ isAxiosError: true, ...partial });

describe('normalizeError — the httpError normalization table', () => {
  // [name, thrown value, expected ApiError] — one row per backend/client shape
  // the app can meet, so every mapping stays pinned.
  const TABLE: {
    name: string;
    error: unknown;
    expected: {
      status: number;
      message: string;
      code?: string;
      fieldErrors?: Record<string, string>;
      source?: 'envelope' | 'auth' | 'transport' | 'client';
    };
  }[] = [
    {
      name: 'feature envelope 422 with field details flattens fieldErrors',
      error: axiosError({
        response: {
          status: 422,
          data: {
            requestId: 'req-1',
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid data',
              details: [
                { path: 'email', message: 'Enter a valid email address' },
                { path: 'phone', message: 'Enter a valid phone number' },
              ],
            },
          },
        },
      }),
      expected: {
        status: 422,
        message: 'Invalid data',
        code: 'VALIDATION_ERROR',
        fieldErrors: { email: 'Enter a valid email address', phone: 'Enter a valid phone number' },
        source: 'envelope',
      },
    },
    {
      name: 'envelope with empty message falls back to the 429 default',
      error: axiosError({
        response: { status: 429, data: { error: { code: 'RATE_LIMITED', message: '' } } },
      }),
      expected: {
        status: 429,
        message: 'Too many requests. Please slow down and try again.',
        code: 'RATE_LIMITED',
        source: 'envelope',
      },
    },
    {
      name: 'envelope error:null takes the better-auth (flat) path',
      error: axiosError({ response: { status: 404, data: { error: null } } }),
      expected: {
        status: 404,
        message: 'We could not find what you were looking for.',
        code: undefined,
        source: 'auth',
      },
    },
    {
      name: 'better-auth flat body maps message + code (403 unverified)',
      error: axiosError({
        response: { status: 403, data: { message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' } },
      }),
      expected: { status: 403, message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED', source: 'auth' },
    },
    {
      name: 'better-auth empty body falls back to the 400 default',
      error: axiosError({ response: { status: 400, data: {} } }),
      expected: { status: 400, message: 'The request was invalid.', code: undefined, source: 'auth' },
    },
    {
      name: 'body null on a 503 gets the server-error default',
      error: axiosError({ response: { status: 503, data: null } }),
      expected: {
        status: 503,
        message: 'Our servers are having trouble. Please try again shortly.',
        code: undefined,
        source: 'auth',
      },
    },
    {
      name: 'response without body data on 401 gets the session default',
      error: axiosError({ response: { status: 401, data: undefined } }),
      expected: {
        status: 401,
        message: 'Your session has expired. Please sign in again.',
        code: undefined,
        source: 'auth',
      },
    },
    {
      name: 'request made but no response (offline) → status 0 network error',
      error: axiosError({ request: { socket: {} }, code: 'ECONNABORTED' }),
      expected: {
        status: 0,
        message: 'Network error. Please check your connection and try again.',
        code: 'ECONNABORTED',
        source: 'transport',
      },
    },
    {
      name: 'non-axios thrown value → generic status 0 error',
      error: 'boom',
      expected: { status: 0, message: 'Something went wrong. Please try again.', code: undefined, source: 'transport' },
    },
  ];

  it.each(TABLE)('$name', ({ error, expected }) => {
    expect(normalizeError(error)).toEqual(expected);
  });

  it('maps every remaining status default (403 / 413 / any 5xx / any 4xx)', () => {
    expect(normalizeError(axiosError({ response: { status: 403, data: null } })).message).toBe(
      'You do not have permission to do that.',
    );
    expect(normalizeError(axiosError({ response: { status: 413, data: null } })).message).toBe(
      'That file or request is too large.',
    );
    expect(normalizeError(axiosError({ response: { status: 422, data: null } })).message).toBe(
      'Please check the highlighted fields and try again.',
    );
    expect(normalizeError(axiosError({ response: { status: 500, data: null } })).message).toBe(
      'Our servers are having trouble. Please try again shortly.',
    );
    expect(normalizeError(axiosError({ response: { status: 418, data: null } })).message).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('keeps the FIRST fieldError message when the backend repeats a path', () => {
    const error = normalizeError(
      axiosError({
        response: {
          status: 422,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid data',
              details: [
                { path: 'email', message: 'first wins' },
                { path: 'email', message: 'second loses' },
              ],
            },
          },
        },
      }),
    );
    expect(error.fieldErrors).toEqual({ email: 'first wins' });
  });

  it('skips malformed detail entries and returns undefined fieldErrors when nothing usable remains', () => {
    const empty = normalizeError(
      axiosError({
        response: { status: 422, data: { error: { message: 'x', details: [] } } },
      }),
    );
    expect(empty.fieldErrors).toBeUndefined();

    const malformed = normalizeError(
      axiosError({
        response: {
          status: 422,
          data: {
            error: {
              message: 'x',
              details: ['nope', null, { message: 'missing path' }, { path: 'p', message: 42 }],
            },
          },
        },
      }),
    );
    expect(malformed.fieldErrors).toBeUndefined();

    const notAnArray = normalizeError(
      axiosError({
        response: { status: 422, data: { error: { message: 'x', details: 'oops' } } },
      }),
    );
    expect(notAnArray.fieldErrors).toBeUndefined();
  });
});

describe('isApiError', () => {
  it('accepts objects with status + message (including normalized errors)', () => {
    expect(isApiError(normalizeError('boom'))).toBe(true);
    expect(isApiError({ status: 0, message: 'x' })).toBe(true);
  });

  it('rejects non-objects and shapes without both fields', () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError('status 500')).toBe(false);
    expect(isApiError({ status: 500 })).toBe(false);
    expect(isApiError({ message: 'x' })).toBe(false);
  });
});

describe('apiError', () => {
  it('builds a client-side ApiError with optional code', () => {
    expect(apiError(0, 'Password required')).toEqual({
      status: 0,
      message: 'Password required',
      source: 'client',
    });
    expect(apiError(401, 'Sign in again', 'SESSION_REQUIRED')).toEqual({
      status: 401,
      message: 'Sign in again',
      code: 'SESSION_REQUIRED',
      source: 'client',
    });
    expect(isApiError(apiError(400, 'x'))).toBe(true);
  });
});
