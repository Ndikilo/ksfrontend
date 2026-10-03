import { resetNetState } from '@/api/netState';
import i18n from '@/i18n';

import { apiClient } from '../client';

/**
 * End-to-end checks of the two client-level error-localization wirings:
 *   1. Accept-Language is sent on every request (the backend localizes /v1
 *      error copy from it).
 *   2. The response interceptor replaces error messages with localized copy.
 * A stub axios adapter stands in for the network (no native XHR in jest).
 */
type StubResponse = {
  data: unknown;
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
};

const stubAdapter = (respond: (config: { headers: unknown }) => StubResponse | Promise<never>) =>
  jest.fn(async (config: { headers: unknown }) => respond(config));

const requestError = (partial: { request?: unknown; code?: string }) => ({
  isAxiosError: true,
  request: {},
  ...partial,
});

describe('client.ts — error layer localization wiring', () => {
  const originalAdapter = apiClient.defaults.adapter;

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    resetNetState();
  });

  it('sends Accept-Language: en by default', async () => {
    const adapter = stubAdapter(() => ({ data: {}, status: 200 }));
    apiClient.defaults.adapter = adapter as unknown as typeof apiClient.defaults.adapter;

    await apiClient.get('/v1/professions');

    const headers = adapter.mock.calls[0][0].headers as { get: (name: string) => unknown };
    expect(headers.get('Accept-Language')).toBe('en');
  });

  it('sends the active locale when the user picked French', async () => {
    await i18n.changeLanguage('fr');
    const adapter = stubAdapter(() => ({ data: {}, status: 200 }));
    apiClient.defaults.adapter = adapter as unknown as typeof apiClient.defaults.adapter;

    await apiClient.get('/v1/professions');
    await i18n.changeLanguage('en'); // restore for other tests

    const headers = adapter.mock.calls[0][0].headers as { get: (name: string) => unknown };
    expect(headers.get('Accept-Language')).toBe('fr');
  });

  it('rejects with the localized network message when the request never lands', async () => {
    apiClient.defaults.adapter = stubAdapter(() => {
      throw requestError({ code: 'ECONNABORTED' });
    }) as unknown as typeof apiClient.defaults.adapter;

    await expect(apiClient.get('/v1/practitioners')).rejects.toMatchObject({
      message: 'The request timed out. Please try again.',
      source: 'transport',
    });
  });

  it('maps a better-auth English error to localized copy in the interceptor', async () => {
    await i18n.changeLanguage('fr');
    apiClient.defaults.adapter = stubAdapter(() => {
      throw {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' },
        },
      };
    }) as unknown as typeof apiClient.defaults.adapter;

    await expect(apiClient.post('/api/auth/sign-in/email', {})).rejects.toMatchObject({
      message: 'E-mail ou mot de passe incorrect.',
      source: 'auth',
    });
    await i18n.changeLanguage('en');
  });

  it('keeps the server’s envelope message (it is already localized via Accept-Language)', async () => {
    apiClient.defaults.adapter = stubAdapter(() => {
      throw {
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            requestId: 'req-1',
            error: { code: 'CONFLICT', message: 'Ce créneau est déjà réservé.' },
          },
        },
      };
    }) as unknown as typeof apiClient.defaults.adapter;

    await expect(apiClient.post('/v1/appointments', {})).rejects.toMatchObject({
      message: 'Ce créneau est déjà réservé.',
      source: 'envelope',
    });
  });
});
