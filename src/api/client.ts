import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/config/env';
import { logger } from '@/utils/logger';

import { normalizeError } from './httpError';

/**
 * The single HTTP client for the whole app.
 *
 * Responsibilities (Single Responsibility: transport only — no business logic):
 *   1. Attach the base URL, headers and timeout.
 *   2. Inject the auth token on every request.
 *   3. Normalise every error into an `ApiError` (see `httpError.ts`).
 *   4. Expose a small typed `http` facade (get/post/put/patch/delete).
 *
 * Services (in `api/services`) build on top of this — they never create their
 * own axios instances, so interceptors/auth/error-handling live in ONE place.
 */

// --- Auth token: held in memory, set by the auth store on login/restore. -----
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Called by the auth store whenever the token changes (login/logout/refresh). */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Register a handler invoked on a 401 so the app can force a sign-out. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

// --- Instance ----------------------------------------------------------------
const instance: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeout,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (authToken) {
    config.headers.set('Authorization', `Bearer ${authToken}`);
  }
  if (env.isDev) {
    logger.debug('http', `${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeError(error);
    // Central place to react to auth expiry regardless of which call triggered it.
    if (normalized.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    logger.warn('http', `Request failed: ${normalized.status} ${normalized.message}`);
    return Promise.reject(normalized);
  },
);

// --- Typed facade ------------------------------------------------------------
// Services call these instead of the raw instance, so the return type is the
// response body (`T`) directly rather than an AxiosResponse.
async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await instance.request<T>(config);
  return response.data;
}

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'GET', url }),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'POST', url, data }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PUT', url, data }),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PATCH', url, data }),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'DELETE', url }),
};

/** Escape hatch if a caller genuinely needs the raw axios instance. */
export const apiClient = instance;
