/**
 * phoneUtils.test.js
 * Unit tests for validatePhoneNumber and validateEmail.
 * Tests every supported country code and edge cases.
 */
import { describe, it, expect } from 'vitest';
import { validatePhoneNumber, validateEmail } from '../../src/lib/phoneUtils';

describe('validatePhoneNumber — Pakistan (+92)', () => {
  it('accepts 11-digit local format with spaces', () => {
    const r = validatePhoneNumber('0300 1234567', '+92');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('+923001234567');
    expect(r.error).toBeNull();
  });

  it('accepts 11-digit local format plain', () => {
    const r = validatePhoneNumber('03001234567', '+92');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('+923001234567');
  });

  it('accepts 11-digit local with dashes and dots', () => {
    expect(validatePhoneNumber('0300-123-4567', '+92').valid).toBe(true);
    expect(validatePhoneNumber('0300.123.4567', '+92').valid).toBe(true);
  });

  it('accepts international +92 prefix', () => {
    const r = validatePhoneNumber('+92 300 1234567', '+92');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('+923001234567');
  });

  it('accepts 0092 international access prefix', () => {
    const r = validatePhoneNumber('00923001234567', '+92');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('+923001234567');
  });

  it('accepts 923 prefix (12 digits)', () => {
    const r = validatePhoneNumber('923001234567', '+92');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('+923001234567');
  });

  it('accepts 10-digit subscriber format', () => {
    const r = validatePhoneNumber('3001234567', '+92');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('+923001234567');
  });

  it('rejects empty string', () => {
    const r = validatePhoneNumber('', '+92');
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Phone number is required');
  });

  it('rejects spaces only', () => {
    const r = validatePhoneNumber('   ', '+92');
    expect(r.valid).toBe(false);
  });

  it('rejects letters only', () => {
    const r = validatePhoneNumber('abcdefghijk', '+92');
    expect(r.valid).toBe(false);
  });

  it('rejects mixed letters and digits', () => {
    const r = validatePhoneNumber('0300-abc-4567', '+92');
    expect(r.valid).toBe(false);
  });

  it('rejects special chars only', () => {
    const r = validatePhoneNumber('!@#$%^&*()', '+92');
    expect(r.valid).toBe(false);
  });

  it('rejects too short (10 digits starting with 03)', () => {
    const r = validatePhoneNumber('0300123456', '+92');
    expect(r.valid).toBe(false);
  });

  it('rejects too long (12 digits starting with 03)', () => {
    const r = validatePhoneNumber('031234567890', '+92');
    expect(r.valid).toBe(false);
  });

  it('rejects wrong start (10 digits not starting with 03 or 3)', () => {
    const r = validatePhoneNumber('1234567890', '+92');
    expect(r.valid).toBe(false);
  });

  it('rejects extension text', () => {
    const r = validatePhoneNumber('03001234567ext123', '+92');
    expect(r.valid).toBe(false);
  });

  it('trims surrounding whitespace', () => {
    const r = validatePhoneNumber(' 0300 1234567 ', '+92');
    expect(r.valid).toBe(true);
  });
});

describe('validatePhoneNumber — other countries', () => {
  const cases = [
    { code: '+971', valid: ['501234567', '50 123 4567', '50123456', '5012345678'], invalid: ['5012345', '50123456789'] },
    { code: '+966', valid: ['501234567', '50123456', '5012345678', '123456789'], invalid: ['5012345'] },
    { code: '+44', valid: ['7700123456', '7700 123 456', '770012345', '77001234567'], invalid: ['77001234'] },
    { code: '+1', valid: ['5551234567', '555-123-4567', '(555) 123-4567', '555123456', '55512345678'], invalid: [] },
    { code: '+49', valid: ['1234567890', '123 456 7890'], invalid: [] },
    { code: '+61', valid: ['412345678', '4 1234 5678'], invalid: [] },
    { code: '+33', valid: ['612345678', '6 12 34 56 78'], invalid: [] },
    { code: '+91', valid: ['9876543210', '98765 43210'], invalid: [] },
    { code: '+999', valid: ['123456789', '12345678', '1234567890'], invalid: ['1234567'] },
  ];

  for (const { code, valid, invalid } of cases) {
    for (const input of valid) {
      it(`accepts ${code} "${input}"`, () => {
        expect(validatePhoneNumber(input, code).valid).toBe(true);
      });
    }
    for (const input of invalid) {
      it(`rejects ${code} "${input}"`, () => {
        expect(validatePhoneNumber(input, code).valid).toBe(false);
      });
    }
  }
});

describe('validateEmail', () => {
  it('accepts known domains', () => {
    const r = validateEmail('user@gmail.com');
    expect(r.valid).toBe(true);
    expect(r.error).toBeNull();
  });

  it('accepts unknown domains with warning (non-strict)', () => {
    const r = validateEmail('user@unknown-corp-domain.xyz');
    expect(r.valid).toBe(true);
    expect(r.warning).toBeTruthy();
    expect(r.error).toBeNull();
  });

  it('rejects structurally invalid email', () => {
    const r = validateEmail('not-an-email');
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('rejects empty email', () => {
    const r = validateEmail('');
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Email address is required');
  });

  it('strict mode rejects unknown domains', () => {
    const r = validateEmail('user@unknown-corp-domain.xyz', { strict: true });
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });
});
