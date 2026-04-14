import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

export const staffAuthGuard: CanActivateFn = async () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  await authStore.waitUntilReady();
  return authStore.isAuthenticated() ? true : router.createUrlTree(['/staff/login']);
};
