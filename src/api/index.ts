/** Public surface of the API module — import everything HTTP from `@/api`. */
export { http, apiClient, setAuthToken, setUnauthorizedHandler } from './client';
export { endpoints } from './endpoints';
export { normalizeError, isApiError, apiError } from './httpError';
export * from './services';
