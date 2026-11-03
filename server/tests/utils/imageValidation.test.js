import { describe, expect, it } from 'vitest';
import { hasAllowedImageSignature } from '../../utils/imageValidation.js';

describe('hasAllowedImageSignature', () => {
  it('accepts supported image signatures when the declared type matches', () => {
    expect(hasAllowedImageSignature({
      mimetype: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    })).toBe(true);
    expect(hasAllowedImageSignature({
      mimetype: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    })).toBe(true);
    expect(hasAllowedImageSignature({
      mimetype: 'image/webp',
      buffer: Buffer.from('RIFF0000WEBP', 'ascii'),
    })).toBe(true);
  });

  it('rejects spoofed, unsupported, or empty file content', () => {
    expect(hasAllowedImageSignature({
      mimetype: 'image/png',
      buffer: Buffer.from('<script>alert(1)</script>'),
    })).toBe(false);
    expect(hasAllowedImageSignature({
      mimetype: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    })).toBe(false);
    expect(hasAllowedImageSignature(null)).toBe(false);
  });
});
