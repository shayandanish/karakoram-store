/**
 * Country dial codes supported in the checkout form.
 * Each entry: { code, flag, name, digits, example }
 *   - digits: expected subscriber number length (without country code)
 *   - example: a human-readable format hint shown to users
 */
export const COUNTRY_CODES = [
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan',      digits: 10, example: '3XX XXXXXXX' },
  { code: '+971', flag: '🇦🇪', name: 'UAE',            digits: 9,  example: '5X XXX XXXX' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia',   digits: 9,  example: '5X XXX XXXX' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom', digits: 10, example: '7XXX XXXXXX' },
  { code: '+1',   flag: '🇺🇸', name: 'United States',  digits: 10, example: 'XXX XXX XXXX' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany',        digits: 10, example: 'XXX XXXXXXX' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia',      digits: 9,  example: 'X XXXX XXXX' },
  { code: '+33',  flag: '🇫🇷', name: 'France',         digits: 9,  example: 'X XX XX XX XX' },
  { code: '+91',  flag: '🇮🇳', name: 'India',          digits: 10, example: 'XXXXX XXXXX' },
];

/**
 * Validate a phone number given a selected country dial code.
 *
 * Pakistan (+92) rules:
 *   - Local format:        03XXXXXXXXX  → exactly 11 digits
 *   - Full intl format:    923XXXXXXXXX → exactly 12 digits (already has country code)
 *   - Subscriber only:     3XXXXXXXXX   → exactly 10 digits
 *
 * Other countries:
 *   - User types subscriber digits (without country code prefix).
 *   - Digit count must match the country's `digits` value (±1 tolerance).
 *
 * @param {string} rawPhone - Raw phone string as typed by the user.
 * @param {string} dialCode - Selected dial code, e.g. '+92'.
 * @returns {{ valid: boolean, normalized: string, error: string|null }}
 */
export const validatePhoneNumber = (rawPhone, dialCode = '+92') => {
  const raw = String(rawPhone || '').trim();
  if (!raw) {
    return { valid: false, normalized: '', error: 'Phone number is required' };
  }

  // Strip everything that is not a digit
  const stripped = raw.replace(/\D/g, '');

  if (dialCode === '+92') {
    // 03XXXXXXXXX — standard Pakistani local format
    if (stripped.startsWith('03') && stripped.length === 11) {
      return { valid: true, normalized: `+92${stripped.slice(1)}`, error: null };
    }
    // 923XXXXXXXXX — user already typed the full number with country code digits
    if (stripped.startsWith('923') && stripped.length === 12) {
      return { valid: true, normalized: `+${stripped}`, error: null };
    }
    // 3XXXXXXXXX — subscriber digits only
    if (stripped.startsWith('3') && stripped.length === 10) {
      return { valid: true, normalized: `+92${stripped}`, error: null };
    }
    return {
      valid: false,
      normalized: '',
      error: 'Pakistani numbers must be 11 digits starting with 03 — e.g. 0300 1234567',
    };
  }

  // International: look up expected digit count from the table
  const countryMeta = COUNTRY_CODES.find((c) => c.code === dialCode);
  const expectedDigits = countryMeta?.digits ?? 9;

  if (stripped.length < expectedDigits - 1 || stripped.length > expectedDigits + 1) {
    const countryName = countryMeta?.name ?? dialCode;
    const exampleFmt = countryMeta?.example ?? 'XXXXXXXXX';
    return {
      valid: false,
      normalized: '',
      error: `Enter ${expectedDigits} digits for ${countryName} (e.g. ${exampleFmt})`,
    };
  }

  return { valid: true, normalized: `${dialCode}${stripped}`, error: null };
};

// ── Email validation ───────────────────────────────────────────────────────

/**
 * Well-known legitimate email providers.
 * Domains listed here are accepted without further checks.
 * Add more as needed — keep lowercase.
 */
export const KNOWN_EMAIL_DOMAINS = new Set([
  // Google
  'gmail.com', 'googlemail.com',
  // Microsoft
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
  'live.com', 'live.co.uk', 'msn.com',
  // Yahoo
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.com.pk',
  'ymail.com', 'rocketmail.com',
  // Apple
  'icloud.com', 'me.com', 'mac.com',
  // ProtonMail
  'protonmail.com', 'proton.me', 'pm.me',
  // Other popular providers
  'zoho.com', 'zohomail.com',
  'fastmail.com', 'fastmail.fm',
  'tutanota.com', 'tutamail.com',
  'yandex.com', 'yandex.ru',
  'mail.com', 'email.com',
  'gmx.com', 'gmx.net', 'gmx.de',
  'aol.com',
  // Pakistan-specific / regional
  'yahoo.com.pk',
  // Corporate / generic TLDs that should always pass structural check
  // (we do NOT block them — we just skip domain-list check for unknown domains)
]);

/**
 * Validate an email address.
 *
 * Two-stage check:
 *  1. Basic structural regex — must have local@domain.tld form.
 *  2. Domain allowlist — if the domain is NOT in KNOWN_EMAIL_DOMAINS, the
 *     email is still accepted but a warning is returned so the UI can show
 *     a soft "double-check your email" notice without hard-blocking submission.
 *
 * @param {string} raw - Raw email string as typed by the user.
 * @param {{ strict?: boolean }} [opts]
 *   strict: when true, unknown domains are treated as errors (hard block).
 *           when false (default), unknown domains produce a warning only.
 * @returns {{ valid: boolean, warning: string|null, error: string|null }}
 */
export const validateEmail = (raw, { strict = false } = {}) => {
  const email = String(raw || '').trim().toLowerCase();

  if (!email) {
    return { valid: false, warning: null, error: 'Email address is required' };
  }

  // Stage 1 — structural check (RFC-5321 simplified)
  // Must have: non-empty local part, @, domain with at least one dot
  const structureOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!structureOk) {
    return {
      valid: false,
      warning: null,
      error: 'Enter a valid email address (e.g. name@gmail.com)',
    };
  }

  // Stage 2 — domain recognition
  const domain = email.split('@')[1];
  const isKnown = KNOWN_EMAIL_DOMAINS.has(domain);

  if (!isKnown) {
    if (strict) {
      return {
        valid: false,
        warning: null,
        error:
          'Please use a well-known email provider (e.g. Gmail, Outlook, Yahoo). ' +
          'This ensures you receive your order confirmation.',
      };
    }
    // Soft warning — email is structurally valid but domain is unrecognised
    return {
      valid: true,
      warning:
        'Double-check your email — unrecognised provider. ' +
        'You may not receive order confirmation emails.',
      error: null,
    };
  }

  return { valid: true, warning: null, error: null };
};

