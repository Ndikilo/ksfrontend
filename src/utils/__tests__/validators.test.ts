import {
  STRONG_PASSWORD_MESSAGE,
  isEmail,
  isNonEmpty,
  isPhone,
  isStrongPassword,
  minLength,
  rules,
  validate,
} from '../validators';

describe('validators (pure helpers)', () => {
  describe('isEmail', () => {
    it.each([
      ['a@b.co', true],
      [' first.last@example.fr ', true],
      ['plus+tag@sub.domain.org', true],
      ['', false],
      ['no-at-sign.com', false],
      ['two@@ats.com', false],
      ['missing-domain@', false],
      ['a b@c.com', false],
    ])('isEmail(%j) → %j', (input, expected) => {
      expect(isEmail(input)).toBe(expected);
    });
  });

  describe('isNonEmpty / minLength', () => {
    it('trims whitespace before deciding emptiness', () => {
      expect(isNonEmpty('   ')).toBe(false);
      expect(isNonEmpty(' x ')).toBe(true);
    });

    it('measures the raw length (no trimming) against the bound inclusively', () => {
      expect(minLength('12345678', 8)).toBe(true);
      expect(minLength('1234567', 8)).toBe(false);
    });
  });

  describe('isPhone', () => {
    it.each([
      ['+237 6 78 90 12 34', true],
      ['678901234', true],
      ['(237) 678-901-234', true],
      ['123456', false], // 6 digits — too short
      ['1234567890123456', false], // 16 digits — too long
      ['no digits at all', false],
      ['', false],
    ])('isPhone(%j) → %j', (input, expected) => {
      expect(isPhone(input)).toBe(expected);
    });
  });

  describe('isStrongPassword', () => {
    it.each([
      ['Passw0rd', true], // 8+ chars, letter, digit
      ['abcdefg1', true], // minimum letters/digits, no capitals needed
      ['short1A', false], // under 8 chars
      ['onlyletters123', true],
      ['12345678', false], // digits but no letter
      ['onlyletters', false], // letters but no digit
      ['', false],
    ])('isStrongPassword(%j) → %j', (input, expected) => {
      expect(isStrongPassword(input)).toBe(expected);
    });
  });

  describe('rules + validate', () => {
    it('required: null when non-empty, message when empty', () => {
      expect(rules.required()('  filled  ')).toBeNull();
      expect(rules.required()('')).toBe('This field is required');
      expect(rules.required('Le champ est requis')('   ')).toBe('Le champ est requis');
    });

    it('email rule uses its custom message on failure', () => {
      expect(rules.email()('a@b.co')).toBeNull();
      expect(rules.email()('broken')).toBe('Enter a valid email address');
    });

    it('min rule states the bound in the default message', () => {
      expect(rules.min(4)('abcde')).toBeNull();
      expect(rules.min(4)('abc')).toBe('Must be at least 4 characters');
      expect(rules.min(4, 'Trop court')('a')).toBe('Trop court');
    });

    it('strongPassword rule carries the shared policy message', () => {
      expect(rules.strongPassword()('no-digit-here')).toBe(STRONG_PASSWORD_MESSAGE);
      expect(rules.strongPassword()('GoodPass1')).toBeNull();
    });

    it('validate returns the FIRST failing rule error and stops', () => {
      const ordered = [rules.required('empty!'), rules.email('bad email'), rules.min(10, 'short!')];
      expect(validate('', ordered)).toBe('empty!');
      expect(validate('not-an-email', ordered)).toBe('bad email');
      expect(validate('a@b.co', ordered)).toBe('short!');
    });

    it('validate returns null when every rule passes', () => {
      expect(validate('user@example.com', [rules.required(), rules.email()])).toBeNull();
    });
  });
});
