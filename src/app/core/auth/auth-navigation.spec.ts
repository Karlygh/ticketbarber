import { DEFAULT_AUTH_REDIRECT_URL, sanitizeReturnUrl } from './auth-navigation';

describe('sanitizeReturnUrl', () => {
  it('keeps internal routes', () => {
    expect(sanitizeReturnUrl('/account')).toBe('/account');
  });

  it('falls back for empty values', () => {
    expect(sanitizeReturnUrl(null)).toBe(DEFAULT_AUTH_REDIRECT_URL);
    expect(sanitizeReturnUrl('')).toBe(DEFAULT_AUTH_REDIRECT_URL);
  });

  it('rejects protocol-relative values', () => {
    expect(sanitizeReturnUrl('//evil.example')).toBe(DEFAULT_AUTH_REDIRECT_URL);
  });
});
