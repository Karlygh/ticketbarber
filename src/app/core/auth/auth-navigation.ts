export const DEFAULT_AUTH_REDIRECT_URL = '/staff';

export function sanitizeReturnUrl(
  returnUrl: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT_URL
): string {
  if (!returnUrl) {
    return fallback;
  }

  return returnUrl.startsWith('/') && !returnUrl.startsWith('//')
    ? returnUrl
    : fallback;
}
