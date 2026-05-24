import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { StripeSubscription } from '../models/user.model';
import { StripeService } from '../services/stripe.service';
import { AuthStore } from './auth.store';
import { UserService } from '../services/user.service';

export type SubscriptionStatus =
  | 'loading'
  | 'free'             // nunca tuvo suscripción, trial expirado
  | 'trial-active'     // dentro del período de prueba gratuita
  | 'trial-expired'    // trial expirado, sin suscripción Stripe
  | 'pro-active'       // Stripe: active
  | 'pro-trialing'     // Stripe: trialing
  | 'pro-canceling'    // Stripe: active + cancelAtPeriodEnd = true
  | 'pro-past-due'     // Stripe: past_due
  | 'pro-expired';     // Stripe: canceled | unpaid | incomplete_expired | paused

const TRIAL_DAYS = 7;

/** Convierte un valor Firestore Timestamp, número ms o segundos a milisegundos */
function toMs(val: unknown): number {
  if (typeof val === 'number') {
    // serverTimestamp guardado como número: > 1e12 son ms, si no son seconds
    return val > 1e12 ? val : val * 1000;
  }
  if (val && typeof (val as { toMillis?: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (val && typeof (val as { seconds?: number }).seconds === 'number') {
    return (val as { seconds: number }).seconds * 1000;
  }
  return 0;
}

/**
 * Store reactivo para el estado de suscripción del usuario actual.
 * Gestiona suscripciones Stripe (Pro) y el trial gratuito de 7 días
 * basado en createdAt del perfil de usuario en Firestore.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionStore {
  private readonly stripeService = inject(StripeService);
  private readonly authStore = inject(AuthStore);
  private readonly userService = inject(UserService);

  private readonly _subscription = signal<StripeSubscription | null | undefined>(undefined);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _trialExpiresAt = signal<Date | null>(null);
  private readonly _profileReady = signal(false);
  private _unsub: (() => void) | null = null;

  /** undefined = cargando, null = sin suscripción, StripeSubscription = suscripción activa */
  readonly subscription = computed(() => this._subscription());
  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());

  readonly hasSubscriptionRecord = computed(() => {
    const sub = this._subscription();
    return sub !== undefined && sub !== null;
  });

  /** true solo si hay suscripción Stripe active|trialing */
  readonly isPro = computed(() => {
    const sub = this._subscription();
    return sub?.status === 'active' || sub?.status === 'trialing';
  });

  readonly isTrialing = computed(() => this._subscription()?.status === 'trialing');

  readonly renewsOn = computed(() => {
    const sub = this._subscription();
    if (!sub) return null;
    return new Date(sub.currentPeriodEnd * 1000);
  });

  /** Fecha de expiración del trial gratuito de 7 días */
  readonly trialExpiresAt = computed(() => this._trialExpiresAt());

  /**
   * true si el usuario está en el período de prueba gratuita (sin suscripción Stripe).
   * Solo se evalúa una vez que el perfil de Firestore está cargado.
   */
  readonly isTrialActive = computed(() => {
    if (!this._profileReady()) return false;
    if (this.hasSubscriptionRecord()) return false;
    const expires = this._trialExpiresAt();
    if (!expires) return false;
    return Date.now() < expires.getTime();
  });

  /** Días enteros restantes del trial gratuito (mínimo 0) */
  readonly trialDaysLeft = computed(() => {
    const expires = this._trialExpiresAt();
    if (!expires) return 0;
    const ms = expires.getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  });

  /**
   * true si el usuario puede acceder a las funciones de pago:
   * suscripción Stripe activa (Pro) O trial gratuito de 7 días en curso.
   */
  readonly hasAccess = computed(() => this.isPro() || this.isPastDue() || this.isTrialActive());

  /** true cuando el perfil de Firestore ya fue leído (necesario para el guard) */
  readonly profileReady = computed(() => this._profileReady());

  /** true si el trial gratuito expiró y no hay suscripción Stripe */
  readonly isTrialExpired = computed(() => {
    if (!this._profileReady()) return false;
    if (this.hasSubscriptionRecord()) return false;
    const expires = this._trialExpiresAt();
    if (!expires) return false;
    return Date.now() >= expires.getTime();
  });

  /** true si la suscripción Stripe tiene pago fallido */
  readonly isPastDue = computed(() => this._subscription()?.status === 'past_due');

  /** true si la suscripción Stripe está activa pero se cancela al final del período */
  readonly isCanceling = computed(() => {
    const sub = this._subscription();
    return sub !== null && sub !== undefined && sub.cancelAtPeriodEnd === true;
  });

  /** true si la suscripción Stripe está en estado terminal (cancelada, impagada, etc.) */
  readonly isExpired = computed(() => {
    const status = this._subscription()?.status;
    return status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired' || status === 'paused';
  });

  /**
   * Estado único derivado de todos los signals. Usar este en los componentes
   * en lugar de combinar isPro() + isTrialActive() manualmente.
   */
  readonly subscriptionStatus = computed((): SubscriptionStatus => {
    if (this._loading() || this._subscription() === undefined) return 'loading';

    const sub = this._subscription();

    // Suscripción Stripe presente
    if (sub !== null && sub !== undefined) {
      if (sub.status === 'past_due') return 'pro-past-due';
      if (sub.status === 'canceled' || sub.status === 'unpaid' ||
          sub.status === 'incomplete_expired' || sub.status === 'paused') return 'pro-expired';
      if (sub.status === 'incomplete') return 'free';
      if (sub.status === 'trialing') return 'pro-trialing';
      if (sub.cancelAtPeriodEnd) return 'pro-canceling';
      return 'pro-active';
    }

    // Sin suscripción Stripe — evaluar trial gratuito
    if (!this._profileReady()) return 'loading';
    if (this.isTrialActive()) return 'trial-active';
    const expires = this._trialExpiresAt();
    if (expires && Date.now() >= expires.getTime()) return 'trial-expired';
    return 'free';
  });

  constructor() {
    effect(() => {
      const user = this.authStore.user();
      const ready = this.authStore.ready();
      if (!ready) return;

      if (this._unsub) {
        this._unsub();
        this._unsub = null;
      }

      if (!user) {
        this._subscription.set(null);
        this._trialExpiresAt.set(null);
        this._loading.set(false);
        this._profileReady.set(true);
        return;
      }

      this._loading.set(true);
      this._profileReady.set(false);
      this._error.set(null);

      // Leer createdAt del perfil para calcular el trial gratuito.
      // Retry con backoff: en registro nuevo, onAuthStateChanged puede disparar
      // antes de que ensureUserProfile() escriba createdAt en Firestore.
      void this.loadProfileWithRetry(user.uid);

      // Escuchar suscripción Stripe en tiempo real
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

  /**
   * Carga el perfil de usuario con un retry de 2 s si createdAt no está listo.
   * Cubre la race condition entre onAuthStateChanged y ensureUserProfile().
   */
  private async loadProfileWithRetry(uid: string, attempt = 0): Promise<void> {
    try {
      const profile = await this.userService.getUserProfile(uid);
      if (profile?.createdAt) {
        const createdMs = toMs(profile.createdAt);
        if (createdMs > 0) {
          this._trialExpiresAt.set(new Date(createdMs + TRIAL_DAYS * 24 * 60 * 60 * 1000));
          this._profileReady.set(true);
          return;
        }
      }
      // createdAt aún no escrito — reintentar una vez tras 2 s
      if (attempt === 0) {
        await new Promise<void>((r) => setTimeout(r, 2000));
        await this.loadProfileWithRetry(uid, 1);
      } else {
        // Segundo intento sin éxito: marcar listo sin trial
        this._profileReady.set(true);
      }
    } catch {
      this._profileReady.set(true);
    }
  }
}
