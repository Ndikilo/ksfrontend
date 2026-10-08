import '@/i18n';

import { practitionerService } from '../practitioner.service';

// The presigned PUT is the one non-axios transport in the app (the authed
// client must NOT forward its bearer token to the storage host), so its
// contract is pinned here: method, header, uri-body, and the localized
// ApiError on a non-2xx.
const mockFetch = jest.fn();
const originalFetch = global.fetch;

describe('practitionerService.uploadDocument', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('PUTs the raw bytes to the presigned URL with the content type and no auth header', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await practitionerService.uploadDocument(
      'https://storage.example/upload?sig=1',
      'application/pdf',
      'file:///cache/certificate.pdf',
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://storage.example/upload?sig=1');
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({ 'Content-Type': 'application/pdf' });
    // React Native's file-upload body — no Authorization key anywhere.
    expect(init.body).toEqual({ uri: 'file:///cache/certificate.pdf' });
    expect(JSON.stringify(init)).not.toContain('Authorization');
  });

  it('a 413 from the storage host rejects with the localized too-large copy', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 413 });

    await expect(
      practitionerService.uploadDocument('https://storage.example/u', 'application/pdf', 'f'),
    ).rejects.toMatchObject({ status: 413, message: 'That file or request is too large.' });
  });

  it('any other non-2xx rejects with the generic retry copy', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    await expect(
      practitionerService.uploadDocument('https://storage.example/u', 'application/pdf', 'f'),
    ).rejects.toMatchObject({ status: 503 });
  });
});
