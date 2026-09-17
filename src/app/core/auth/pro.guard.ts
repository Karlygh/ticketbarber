import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { SubscriptionStore } from '../stores/subscription.store';
import { sanitizeReturnUrl } from './auth-navigation';

/**
 * Protege rutas que requieren acceso completo:
 * suscripción Stripe activa (Pro) O trial gratuito de 7 días en curso.
 * Redirige a /subscription si no tiene acceso, o a /staff/login si no autenticado.
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

  // Esperar a que tanto la suscripción Stripe como el perfil estén listos
  const storeReady = await waitForStoreReady(subscriptionStore);

  // Fail-closed: si no se ha podido determinar el estado de la suscripción no
  // se concede acceso. Conceder por defecto convertiría una incidencia de
  // Firestore en un bypass del control de acceso (ENS op.acc.4).
  if (!storeReady) {
    return router.createUrlTree(['/pricing'], {
      queryParams: { reason: 'subscription-unavailable' }
    });
  }

  if (subscriptionStore.hasAccess()) {
    return true;
  }

  // Diferenciar motivo: trial expirado vs. sin suscripción nunca contratada
  const trialExpires = subscriptionStore.trialExpiresAt();
  const reason = trialExpires && Date.now() > trialExpires.getTime()
    ? 'trial-expired'
    : 'subscription-required';

  return router.createUrlTree(['/pricing'], {
    queryParams: { reason }
  });
};

/** Resuelve true si el estado de suscripción quedó determinado, false si expiró el plazo. */
function waitForStoreReady(store: SubscriptionStore): Promise<boolean> {
  return new Promise((resolve) => {
    if (!store.loading() && store.profileReady()) {
      resolve(true);
      return;
    }
    // Poll ligero con timeout de 5s para que Firestore responda
    const start = Date.now();
    const interval = setInterval(() => {
      if (!store.loading() && store.profileReady()) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > 5000) {
        clearInterval(interval);
        resolve(false);
      }
    }, 50);
  });
}
