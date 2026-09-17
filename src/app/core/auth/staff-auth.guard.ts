import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { sanitizeReturnUrl } from './auth-navigation';

export const staffAuthGuard: CanActivateFn = async (_, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  await authStore.waitUntilReady();

  // ENS op.acc.7: una sesión inactiva demasiado tiempo se cierra antes de
  // conceder acceso.
  const expired = await authStore.enforceInactivityLimit();

  return authStore.isAuthenticated()
    ? true
    : router.createUrlTree(['/staff/login'], {
      queryParams: {
        reason: expired ? 'session-expired' : 'auth-required',
        returnUrl: sanitizeReturnUrl(state.url)
      }
    });
};
