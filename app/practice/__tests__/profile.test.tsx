import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { PractitionerVerification, User } from '@/types';

import PracticeProfileScreen from '../profile';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — useFocusEffect runs its callback on every focus (like
// expo-router) and is captured so tests can drive a re-focus refetch; the
// card navigates to the registration step on a 404.
let mockOnRefocus: (() => void) | undefined;
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    get push() {
      return mockPush;
    },
  },
  useFocusEffect: (callback: () => void) => {
    // expo-router runs the callback on focus — approximated by running it
    // once per stable callback identity (the card wraps it in useCallback).
    if (mockOnRefocus !== callback) {
      mockOnRefocus = callback;
      callback();
    }
  },
}));

// API seam — services only (useAsync imports the barrel for helpers).
const mockGetVerification = jest.fn();
const mockPresign = jest.fn();
const mockUpload = jest.fn();
const mockSubmitCredentials = jest.fn();
jest.mock('@/api/services', () => ({
  practitionerService: {
    getVerification: (...args: unknown[]) => mockGetVerification(...args),
    presignDocument: (...args: unknown[]) => mockPresign(...args),
    uploadDocument: (...args: unknown[]) => mockUpload(...args),
    submitCredentials: (...args: unknown[]) => mockSubmitCredentials(...args),
  },
}));

// Auth seam — the shared ProfileView reads the session. The pure role helpers
// stay wired in.
const mockUseAuth = jest.fn();
jest.mock('@/store', () => ({
  ...jest.requireActual('@/store/roles'),
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// Screen chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Native document picker seam — each pick "returns" a PDF asset, or a JPEG
// when the caller allowed images (the profile-photo row).
const mockPick = jest.fn();
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockPick(...args),
}));

const PRACTITIONER: User = {
  id: 'pro-1',
  fullName: 'Dr Test',
  email: 'pro@example.com',
  role: 'doctor',
  locale: 'en',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const verification = (
  overrides: Partial<PractitionerVerification> = {},
): PractitionerVerification => ({
  status: 'incomplete',
  submittedAt: null,
  documents: [],
  latestDecision: null,
  canResubmit: true,
  ...overrides,
});

const PDF_ASSET = {
  uri: 'file:///cache/certificate.pdf',
  name: 'certificate.pdf',
  size: 240_000,
  mimeType: 'application/pdf',
};
const JPEG_ASSET = {
  uri: 'file:///cache/photo.jpg',
  name: 'photo.jpg',
  size: 120_000,
  mimeType: 'image/jpeg',
};

/** The picker answers per requested mime set: images → JPEG, documents → PDF. */
const pickAnswer = (type: string[]) => ({
  canceled: false,
  assets: [type.includes('image/jpeg') ? JPEG_ASSET : PDF_ASSET],
});

const renderScreen = () =>
  render(
    <ThemeProvider>
      <PracticeProfileScreen />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
  mockOnRefocus = undefined;
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    session: { token: 't', user: PRACTITIONER },
  });
  mockGetVerification.mockResolvedValue(verification());
  mockPick.mockImplementation(({ type }: { type: string[] }) => pickAnswer(type));
  mockPresign.mockImplementation(async (_kind: string, contentType: string) => ({
    url: `https://storage.example/${contentType}`,
    key: `key-${_kind}`,
  }));
  mockUpload.mockResolvedValue(undefined);
});

afterEach(async () => {
  // Drain pending macrotasks INSIDE act (act hygiene, qc-008 rule).
  await act(async () => {});
});

describe('Verification pending state (P7.T4)', () => {
  it('a pending profile shows the honest under-review state with no form', async () => {
    mockGetVerification.mockResolvedValue(
      verification({
        status: 'pending_verification',
        submittedAt: '2026-10-01T09:00:00.000Z',
        canResubmit: false,
      }),
    );
    const screen = renderScreen();

    // Under review + what it means for patients (they cannot book yet)…
    expect(await screen.findByText('Under review')).toBeTruthy();
    expect(
      screen.getByText(
        'An administrator is checking your documents, usually within a few days. Patients cannot find or book you yet — we will notify you as soon as a decision is made.',
      ),
    ).toBeTruthy();
    // Same formatter the card uses — locale-independent expectation.
    const expectedDate = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
    }).format(new Date('2026-10-01T09:00:00.000Z'));
    expect(screen.getByText(`Submitted on ${expectedDate}`)).toBeTruthy();
    // …and no submission form is offered while waiting.
    expect(screen.queryByText('Submit for verification')).toBeNull();
  });

  it('a verified profile shows the verified badge', async () => {
    mockGetVerification.mockResolvedValue(
      verification({ status: 'verified', canResubmit: false }),
    );
    const screen = renderScreen();
    expect(await screen.findByText('Verified')).toBeTruthy();
    expect(screen.getByText('Patients can find and book you.')).toBeTruthy();
  });

  it('an incomplete profile renders the credentials form with all three documents', async () => {
    const screen = renderScreen();

    expect(await screen.findByText('Action needed')).toBeTruthy();
    expect(screen.getByLabelText('Cameroon Medical Council number')).toBeTruthy();
    expect(screen.getByLabelText('National ID card number')).toBeTruthy();
    expect(screen.getByTestId('credential-doc-cmc-certificate')).toBeTruthy();
    expect(screen.getByTestId('credential-doc-nic')).toBeTruthy();
    expect(screen.getByTestId('credential-doc-profile-photo')).toBeTruthy();
  });

  it('a rejected profile shows the reason from the API and the re-submit path', async () => {
    mockGetVerification.mockResolvedValue(
      verification({
        status: 'rejected',
        latestDecision: {
          decision: 'rejected',
          reason: 'The certificate copy was unreadable.',
          createdAt: '2026-10-02T10:00:00.000Z',
        },
      }),
    );
    const screen = renderScreen();

    expect(await screen.findByText('Not approved')).toBeTruthy();
    expect(screen.getByText('Reason given')).toBeTruthy();
    expect(screen.getByText('The certificate copy was unreadable.')).toBeTruthy();
    // The re-submit path is the form itself.
    expect(screen.getByText('Submit for verification')).toBeTruthy();
  });
});

describe('Credentials submission (P7.T4)', () => {
  const fillNumbers = (screen: ReturnType<typeof renderScreen>) => {
    fireEvent.changeText(
      screen.getByLabelText('Cameroon Medical Council number'),
      'CMC-2024-01234',
    );
    fireEvent.changeText(screen.getByLabelText('National ID card number'), '123456789');
  };

  it('submitting nothing shows the nothing-selected message and never calls the endpoint', async () => {
    const screen = renderScreen();
    await screen.findByText('Action needed');

    fireEvent.press(screen.getByText('Submit for verification'));

    expect(await screen.findByText('Enter both numbers and attach all three documents to submit.')).toBeTruthy();
    expect(mockSubmitCredentials).not.toHaveBeenCalled();
  });

  it('the happy path uploads each pick and submits the exact credential shape', async () => {
    mockGetVerification
      .mockResolvedValueOnce(verification())
      .mockResolvedValueOnce(
        verification({ status: 'pending_verification', canResubmit: false }),
      );
    const screen = renderScreen();
    await screen.findByText('Action needed');

    // Attach the three documents (the picker answers per mime set) and wait
    // for each presign + PUT to land.
    fireEvent.press(screen.getAllByText('Choose file')[0]);
    await waitFor(() => expect(mockPresign).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getAllByText('Choose file')[0]);
    await waitFor(() => expect(mockPresign).toHaveBeenCalledTimes(2));
    fireEvent.press(screen.getAllByText('Choose file')[0]);
    await waitFor(() => expect(mockPresign).toHaveBeenCalledTimes(3));

    // The upload went to the presigned URL mechanism, one presign per document
    // kind, in the documented order.
    expect(mockPresign).toHaveBeenNthCalledWith(1, 'cmc-certificate', 'application/pdf');
    expect(mockPresign).toHaveBeenNthCalledWith(2, 'nic', 'application/pdf');
    expect(mockPresign).toHaveBeenNthCalledWith(3, 'profile-photo', 'image/jpeg');
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(3));

    fillNumbers(screen);
    fireEvent.press(screen.getByText('Submit for verification'));

    // The endpoint received the REAL contract shape (numbers + the three keys
    // returned by the presign calls).
    await waitFor(() =>
      expect(mockSubmitCredentials).toHaveBeenCalledWith({
        cmcRegistrationNumber: 'CMC-2024-01234',
        nicNumber: '123456789',
        cmcCertificateFileKey: 'key-cmc-certificate',
        nicFileKey: 'key-nic',
        profilePhotoFileKey: 'key-profile-photo',
      }),
    );
    // The card re-pulls the verification record and lands on under review.
    await screen.findByText('Under review');
    expect(mockGetVerification).toHaveBeenCalledTimes(2);
  });

  it('a failed upload keeps the file with an explicit retry that re-issues the round-trip', async () => {
    const screen = renderScreen();
    await screen.findByText('Action needed');

    mockPresign.mockRejectedValueOnce({ status: 500, message: 'Boom', code: 'INTERNAL' });
    fireEvent.press(screen.getAllByText('Choose file')[0]);

    expect(await screen.findByText('Upload failed.')).toBeTruthy();
    expect(screen.getByText('Retry upload')).toBeTruthy();
    // Nothing was submitted: there is no key for the failed document.
    fireEvent.press(screen.getByText('Submit for verification'));
    expect(mockSubmitCredentials).not.toHaveBeenCalled();

    // The retry issues a NEW presign + PUT (standard §2: pin the new call,
    // not just a flag flip).
    fireEvent.press(screen.getByText('Retry upload'));
    await waitFor(() => expect(mockPresign).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
    // The row settles: the failed copy is gone, the file name is back.
    await waitFor(() => expect(screen.queryByText('Upload failed.')).toBeNull());
  });

  it('a rejected submission surfaces the failure Banner over the form', async () => {
    mockSubmitCredentials.mockRejectedValueOnce({
      status: 409,
      message: 'This registration number is already in use.',
      code: 'LICENCE_ALREADY_REGISTERED',
    });
    const screen = renderScreen();
    await screen.findByText('Action needed');

    for (let index = 0; index < 3; index += 1) {
      fireEvent.press(screen.getAllByText('Choose file')[0]);
      await waitFor(() => expect(mockPresign).toHaveBeenCalledTimes(index + 1));
    }
    fillNumbers(screen);
    fireEvent.press(screen.getByText('Submit for verification'));

    expect(
      await screen.findByText('This registration number is already in use.'),
    ).toBeTruthy();
    // The form stays usable for the corrected attempt.
    expect(screen.getByText('Submit for verification')).toBeTruthy();
  });

  it('an oversize pick is rejected locally before any network call', async () => {
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [{ ...PDF_ASSET, size: 30 * 1024 * 1024 }],
    });
    const screen = renderScreen();
    await screen.findByText('Action needed');

    fireEvent.press(screen.getAllByText('Choose file')[0]);

    expect(
      await screen.findByText('That file is larger than 25 MB. Choose a smaller one.'),
    ).toBeTruthy();
    expect(mockPresign).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });
});

describe('Verification status refresh (P7.T4)', () => {
  it('a failed re-focus refetch shows a Banner over the mounted card', async () => {
    mockGetVerification.mockResolvedValue(
      verification({ status: 'pending_verification', canResubmit: false }),
    );
    const screen = renderScreen();
    await screen.findByText('Under review');

    mockGetVerification.mockRejectedValueOnce({ status: 0, message: 'No connection.' });
    act(() => mockOnRefocus?.());

    expect(
      await screen.findByText(
        'Your verification status could not be refreshed — what you see below may be out of date.',
      ),
    ).toBeTruthy();
    // The stale under-review state stays mounted (stale-while-revalidate).
    expect(screen.getByText('Under review')).toBeTruthy();
  });

  it('a re-focus refetch picks up the admin decision', async () => {
    mockGetVerification
      .mockResolvedValueOnce(verification({ status: 'pending_verification', canResubmit: false }))
      .mockResolvedValueOnce(verification({ status: 'verified', canResubmit: false }));
    const screen = renderScreen();
    await screen.findByText('Under review');

    act(() => mockOnRefocus?.());

    expect(await screen.findByText('Verified')).toBeTruthy();
    expect(mockGetVerification).toHaveBeenCalledTimes(2);
  });

  it('a first-load failure shows the retryable error state', async () => {
    mockGetVerification.mockRejectedValue({ status: 500, message: 'Boom', code: 'INTERNAL' });
    const screen = renderScreen();
    expect(await screen.findByText('Something went wrong')).toBeTruthy();

    mockGetVerification.mockResolvedValue(verification());
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('Action needed')).toBeTruthy();
  });

  it('a 404 points at the registration step instead of a dead end', async () => {
    mockGetVerification.mockRejectedValue({ status: 404, message: 'None.', code: 'NOT_FOUND' });
    const screen = renderScreen();

    fireEvent.press(await screen.findByText('Complete registration'));
    expect(mockPush).toHaveBeenCalledWith('/practitioner/register');
  });
});
