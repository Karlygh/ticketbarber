import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { SubscriptionStore } from '../stores/subscription.store';
import { sanitizeReturnUrl } from './auth-navigation';

/**
 * Protege rutas que requieren suscripción Pro activa (active | trialing).
 * Redirige a /subscription si no es Pro, o a /staff/login si no autenticado.
 */
export const proGuard: CanActivateFn = async (_, state) => {
  const authStore = inject(AuthStore);
  const subscriptionStore = inject(SubscriptionStore);
  const router = inject(Router);

  await authStore.waitUntilReady();

  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/staff/login'], {
      queryParams: {
        reason: 'auth-required',
        returnUrl: sanitizeReturnUrl(state.url)
      }
    });
  }

  // Esperar a que el store de suscripción deje de cargar
  await waitForSubscriptionLoad(subscriptionStore);

  if (subscriptionStore.isPro()) {
    return true;
  }

  return router.createUrlTree(['/subscription'], {
    queryParams: { reason: 'subscription-required' }
  });
};

function waitForSubscriptionLoad(store: SubscriptionStore): Promise<void> {
  return new Promise((resolve) => {
    // Si ya cargó, resolvemos inmediatamente
    if (!store.loading()) {
      resolve();
      return;
    }
    // Poll ligero: max 5s para que Firestore responda
    const start = Date.now();
    const interval = setInterval(() => {
      if (!store.loading() || Date.now() - start > 5000) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}
