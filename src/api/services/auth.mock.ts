import type {
  Account,
  AuthSession,
  Credentials,
  OtpChallenge,
  RegisterPayload,
  ResetTicket,
  User,
} from '@/types';

/**
 * In-memory fake auth backend, used when `env.mockAuth` is true so the whole
 * register/login/reset flow can be exercised without the server. It mirrors the
 * real backend's behaviour: any well-formed 6-digit code verifies except
 * `000000` (error path demo), and signing in as `unverified@example.com`
 * triggers the EMAIL_NOT_VERIFIED route the real backend returns.
 */
const delay = (ms = 650) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function maskTarget(identifier: string): string {
  const digits = identifier.replace(/[^0-9]/g, '');
  if (digits.length >= 6) {
    return `${digits.slice(0, 4)}${'*'.repeat(Math.max(4, digits.length - 6))}${digits.slice(-2)}`;
  }
  // Email fallback: keep first 2 chars + domain.
  const [name = '', domain = ''] = identifier.split('@');
  return domain ? `${name.slice(0, 2)}***@${domain}` : identifier;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: `u_${Date.now()}`,
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    role: 'patient',
    locale: 'en',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSession(user: User): AuthSession {
  return { token: `mock.${Date.now()}`, user };
}

function assertCode(code: string) {
  if (!/^\d{6}$/.test(code) || code === '000000') {
    throw { status: 400, message: 'The code you entered is invalid or has expired.' };
  }
}

function challenge(identifier: string): OtpChallenge {
  return { identifier, maskedTarget: maskTarget(identifier), expiresInSeconds: 300 };
}

const account = (user: User): Account => ({
  id: user.id,
  email: user.email,
  name: user.fullName,
  roles: [user.role],
  locale: user.locale,
});

export const authMock = {
  async login({ identifier }: Credentials): Promise<AuthSession> {
    await delay();
    if (identifier.trim().toLowerCase() === 'unverified@example.com') {
      throw { status: 403, code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' };
    }
    return makeSession(makeUser({ email: identifier.includes('@') ? identifier : 'jane.doe@example.com' }));
  },

  async logout(): Promise<void> {
    await delay(200);
  },

  async me(): Promise<User | null> {
    await delay(150);
    return makeUser();
  },

  async account(): Promise<Account> {
    return account(makeUser());
  },

  async register(payload: RegisterPayload): Promise<OtpChallenge> {
    await delay();
    return challenge(payload.email);
  },

  async resendOtp(): Promise<void> {
    await delay(300);
  },

  async verifyRegistration({ identifier, code }: { identifier: string; code: string }): Promise<AuthSession> {
    await delay();
    assertCode(code);
    return makeSession(makeUser({ email: identifier.includes('@') ? identifier : 'jane.doe@example.com' }));
  },

  async forgotPassword(identifier: string): Promise<OtpChallenge> {
    await delay();
    return challenge(identifier);
  },

  async verifyReset({ code }: { identifier: string; code: string }): Promise<ResetTicket> {
    await delay();
    assertCode(code);
    return { otp: code };
  },

  async resetPassword(): Promise<void> {
    await delay();
  },
};
