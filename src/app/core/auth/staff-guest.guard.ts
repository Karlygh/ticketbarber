import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { sanitizeReturnUrl } from './auth-navigation';

export const staffGuestGuard: CanActivateFn = async (route) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  await authStore.waitUntilReady();

  if (!authStore.isAuthenticated()) {
    return true;
  }

  const returnUrl = sanitizeReturnUrl(route.queryParamMap.get('returnUrl'));
  return router.parseUrl(returnUrl);
};
