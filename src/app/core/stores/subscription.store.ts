import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { StripeSubscription } from '../models/user.model';
import { StripeService } from '../services/stripe.service';
import { AuthStore } from './auth.store';

/**
 * Store reactivo para el estado de suscripción del usuario actual.
 * Se suscribe automáticamente a Firestore cuando el usuario está autenticado
 * y cancela la suscripción cuando cierra sesión.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionStore {
  private readonly stripeService = inject(StripeService);
  private readonly authStore = inject(AuthStore);

  private readonly _subscription = signal<StripeSubscription | null | undefined>(undefined);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private _unsub: (() => void) | null = null;

  /** undefined = cargando, null = sin suscripción, StripeSubscription = suscripción activa */
  readonly subscription = computed(() => this._subscription());
  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());

  /** true solo si hay suscripción active|trialing */
  readonly isPro = computed(() => {
    const sub = this._subscription();
    return sub !== undefined && sub !== null;
  });

  readonly isTrialing = computed(() => this._subscription()?.status === 'trialing');

  readonly renewsOn = computed(() => {
    const sub = this._subscription();
    if (!sub) return null;
    return new Date(sub.currentPeriodEnd * 1000);
  });

  constructor() {
    // Reacciona al cambio de usuario (login/logout) con effect
    effect(() => {
      const user = this.authStore.user();
      const ready = this.authStore.ready();
      if (!ready) return;

      // Limpiar suscripción previa
      if (this._unsub) {
        this._unsub();
        this._unsub = null;
      }

      if (!user) {
        this._subscription.set(null);
        this._loading.set(false);
        return;
      }

      this._loading.set(true);
      this._error.set(null);

      const obs = this.stripeService.getActiveSubscription(user.uid);
      const sub = obs.subscribe({
        next: (s) => {
          this._subscription.set(s);
          this._loading.set(false);
        },
        error: (e) => {
          this._error.set((e as Error).message ?? 'Error al cargar suscripción');
          this._loading.set(false);
        }
      });

      this._unsub = () => sub.unsubscribe();
    });
  }
}
