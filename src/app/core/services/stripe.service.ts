import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  updateDoc
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { firstValueFrom, Observable } from 'rxjs';
import {
  CheckoutSession,
  Payment,
  SubscriptionStatus,
  StripePrice,
  StripeProduct,
  StripeSubscription
} from '../models/user.model';

/**
 * Interactúa con la extensión Firebase "Run Payments with Stripe".
 * La extensión escucha la colección customers/{uid}/checkout_sessions
 * y rellena automáticamente sessionId/url cuando está lista.
 *
 * ── Testing local con Stripe CLI ──────────────────────────────────────────
 * # Escuchar webhooks en local y redirigirlos a Firebase Emulator
 * stripe listen --forward-to localhost:5001/ticketbarber-7c16d/us-central1/ext-firestore-stripe-payments-handleWebhookEvents
 *
 * # Simular un pago exitoso
 * stripe trigger checkout.session.completed
 *
 * # Simular cancelación de suscripción
 * stripe trigger customer.subscription.deleted
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Documentación oficial:
 * https://github.com/invertase/stripe-firebase-extensions/blob/master/firestore-stripe-payments/POSTINSTALL.md
 */
@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly firestore = inject(Firestore);
  private readonly functions = inject(Functions);

  private static readonly CHECKOUT_TIMEOUT_MS = 30_000;
  private static readonly SUBSCRIPTION_PRIORITY: Readonly<Record<SubscriptionStatus, number>> = {
    active: 0,
    trialing: 1,
    past_due: 2,
    incomplete: 3,
    canceled: 4,
    unpaid: 5,
    incomplete_expired: 6,
    paused: 7
  };

  // ── Catálogo de productos ───────────────────────────────────────────────

  /** Lee productos activos con sus precios activos anidados desde Firestore. */
  getProducts(): Observable<(StripeProduct & { prices: StripePrice[] })[]> {
    return new Observable((subscriber) => {
      const productsRef = collection(this.firestore, 'products');
      const q = query(productsRef, where('active', '==', true));

      const priceUnsubs: (() => void)[] = [];

      const unsub = onSnapshot(
        q,
        (snap) => {
          // Limpiar listeners de precios anteriores
          priceUnsubs.forEach((u) => u());
          priceUnsubs.length = 0;

          const products: (StripeProduct & { prices: StripePrice[] })[] = [];
          let pending = snap.docs.length;

          if (pending === 0) {
            subscriber.next([]);
            return;
          }

          snap.docs.forEach((productDoc) => {
            const raw = productDoc.data();
            const product: StripeProduct & { prices: StripePrice[] } = {
              id: productDoc.id,
              active: raw['active'] ?? true,
              name: raw['name'] ?? '',
              description: raw['description'] ?? '',
              metadata: raw['metadata'] ?? {},
              images: raw['images'] ?? [],
              prices: []
            };
            products.push(product);

            // Subcolección de precios
            const pricesRef = collection(this.firestore, `products/${productDoc.id}/prices`);
            const pq = query(pricesRef, where('active', '==', true));
            const priceUnsub = onSnapshot(pq, (priceSnap) => {
              const normalized = priceSnap.docs
                .map((d) => {
                  const p = d.data();
                  const recurring = p['recurring'] as Record<string, unknown> | undefined;
                  const resolvedInterval =
                    (p['interval'] as 'month' | 'year' | undefined) ??
                    (recurring?.['interval'] as 'month' | 'year' | undefined) ??
                    'month';
                  const resolvedIntervalCount =
                    (p['interval_count'] as number | undefined) ??
                    (recurring?.['interval_count'] as number | undefined) ??
                    1;
                  return {
                    id: d.id,
                    active: p['active'] ?? true,
                    currency: p['currency'] ?? 'eur',
                    unit_amount: p['unit_amount'] ?? 0,
                    type: p['type'] ?? 'recurring',
                    interval: resolvedInterval,
                    interval_count: resolvedIntervalCount,
                    product: p['product'] ?? productDoc.id
                  } as StripePrice;
                })
                .filter(
                  (price) =>
                    price.active &&
                    price.type === 'recurring' &&
                    (price.interval === 'month' || price.interval === 'year')
                )
                .sort((a, b) => {
                  if (a.interval !== b.interval) return a.interval.localeCompare(b.interval);
                  if (a.unit_amount !== b.unit_amount) return a.unit_amount - b.unit_amount;
                  return a.id.localeCompare(b.id);
                });
              product.prices = normalized;
              pending--;
              if (pending <= 0) {
                subscriber.next([...products]);
              }
            });
            priceUnsubs.push(priceUnsub);
          });
        },
        (err) => subscriber.error(err)
      );

      return () => {
        unsub();
        priceUnsubs.forEach((u) => u());
      };
    });
  }

  /** Lee precios activos de un producto específico. */
  getPrices(productId: string): Observable<StripePrice[]> {
    return new Observable((subscriber) => {
      const pricesRef = collection(this.firestore, `products/${productId}/prices`);
      const q = query(pricesRef, where('active', '==', true));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const prices: StripePrice[] = snap.docs.map((d) => {
            const p = d.data();
            return {
              id: d.id,
              active: p['active'] ?? true,
              currency: p['currency'] ?? 'eur',
              unit_amount: p['unit_amount'] ?? 0,
              type: p['type'] ?? 'recurring',
              interval: p['interval'] ?? 'month',
              interval_count: p['interval_count'] ?? 1,
              product: p['product'] ?? productId
            } as StripePrice;
          });
          subscriber.next(prices);
        },
        (err) => subscriber.error(err)
      );

      return () => unsub();
    });
  }

  // ── Checkout ────────────────────────────────────────────────────────────

  /**
   * Crea un checkout_session y espera a que la extensión Stripe rellene la URL.
   * Redirige automáticamente al usuario a Stripe Checkout.
   * Timeout de 30s: si la URL no llega, emite error.
   */
  startCheckout(uid: string, priceId: string, trial = false): Observable<string> {
    return new Observable<string>((subscriber) => {
      const sessionsRef = collection(this.firestore, `customers/${uid}/checkout_sessions`);

      const sessionData: CheckoutSession = {
        price: priceId,
        success_url: `${window.location.origin}/subscription/success`,
        cancel_url: `${window.location.origin}/subscription/cancel`,
        allow_promotion_codes: true,
        metadata: { createdAt: new Date().toISOString() },
        ...(trial ? { trial_period_days: 7 } : {})
      };

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let unsub: (() => void) | null = null;

      const cleanup = () => {
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        if (unsub) { unsub(); unsub = null; }
      };

      addDoc(sessionsRef, sessionData)
        .then((docRef) => {
          // Timeout de 30s
          timeoutId = setTimeout(() => {
            cleanup();
            subscriber.error(new Error('La sesión expiró. Inténtalo de nuevo.'));
          }, StripeService.CHECKOUT_TIMEOUT_MS);

          unsub = onSnapshot(docRef, (snap) => {
            const data = snap.data() as CheckoutSession | undefined;
            if (!data) return;

            if (data.error) {
              cleanup();
              subscriber.error(new Error(data.error.message));
              return;
            }

            if (data.url) {
              cleanup();
              // Emitimos sessionId y url para que el componente pueda redirigir
              window.location.assign(data.url);
              subscriber.next(docRef.id);
              subscriber.complete();
            }
          });
        })
        .catch((err) => {
          cleanup();
          subscriber.error(err);
        });

      return () => cleanup();
    });
  }

  /** Marca una checkout_session como cancelada por el usuario. */
  cancelCheckoutSession(uid: string, sessionId: string): Promise<void> {
    const sessionDoc = doc(this.firestore, `customers/${uid}/checkout_sessions/${sessionId}`);
    return updateDoc(sessionDoc, { cancelled: true });
  }

  // ── Portal de cliente ───────────────────────────────────────────────────

  /** Abre el portal de cliente Stripe para gestionar suscripción, facturas y método de pago. */
  async createPortalSession(): Promise<void> {
    try {
      const createPortalLink = httpsCallable<
        { returnUrl: string },
        { url: string }
      >(this.functions, 'ext-firestore-stripe-payments-createPortalLink');

      const result = await createPortalLink({
        returnUrl: `${window.location.origin}/subscription/manage`
      });

      const url = result.data?.url;
      console.info('[Stripe] Portal link response received', {
        hasUrl: typeof url === 'string' && url.length > 0
      });

      if (!url || typeof url !== 'string') {
        throw new Error('La función de portal respondió sin URL válida.');
      }

      window.location.assign(url);
    } catch (err: unknown) {
      console.error('[Stripe] Error al crear portal de cliente:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido al abrir el portal.';
      throw new Error(`No se pudo abrir el portal de gestión: ${message}`);
    }
  }

  /** Variante basada en Promise para reutilizar el mismo flujo de checkout desde varias pantallas. */
  startCheckoutRedirect(uid: string, priceId: string, trial = false): Promise<string> {
    return firstValueFrom(this.startCheckout(uid, priceId, trial));
  }

  // ── Suscripciones ──────────────────────────────────────────────────────

  /** Devuelve la suscripción más relevante del usuario para que la UI interprete su estado actual. */
  getActiveSubscription(uid: string): Observable<StripeSubscription | null> {
    return new Observable<StripeSubscription | null>((subscriber) => {
      const subsRef = collection(this.firestore, `customers/${uid}/subscriptions`);
      const q = query(
        subsRef,
        where('status', 'in', [
          'active',
          'trialing',
          'past_due',
          'canceled',
          'unpaid',
          'incomplete',
          'incomplete_expired',
          'paused'
        ])
      );

      const unsub = onSnapshot(
        q,
        (snap) => {
          if (snap.empty) {
            subscriber.next(null);
            return;
          }
          const current = snap.docs
            .map((subDoc) => this.toSubscription(subDoc.id, subDoc.data()))
            .sort((a, b) => this.compareSubscriptions(a, b))[0] ?? null;
          subscriber.next(current);
        },
        (err) => subscriber.error(err)
      );

      return () => unsub();
    });
  }

  /** Devuelve TODAS las suscripciones (para mostrar historial). */
  getAllSubscriptions(uid: string): Observable<StripeSubscription[]> {
    return new Observable<StripeSubscription[]>((subscriber) => {
      const subsRef = collection(this.firestore, `customers/${uid}/subscriptions`);
      const q = query(subsRef, orderBy('current_period_end', 'desc'));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const subs: StripeSubscription[] = snap.docs.map((d) => this.toSubscription(d.id, d.data()));
          subscriber.next(subs);
        },
        (err) => subscriber.error(err)
      );

      return () => unsub();
    });
  }

  // ── Pagos ──────────────────────────────────────────────────────────────

  /** Lee el historial de pagos del usuario. */
  getPayments(uid: string): Observable<Payment[]> {
    return new Observable<Payment[]>((subscriber) => {
      const paymentsRef = collection(this.firestore, `customers/${uid}/payments`);
      const q = query(paymentsRef, orderBy('created', 'desc'));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const payments: Payment[] = snap.docs.map((d) => {
            const raw = d.data();
            return {
              id: d.id,
              amount: raw['amount'] ?? 0,
              currency: raw['currency'] ?? 'eur',
              status: raw['status'] ?? 'unknown',
              created: raw['created']?.seconds ?? 0
            } as Payment;
          });
          subscriber.next(payments);
        },
        (err) => subscriber.error(err)
      );

      return () => unsub();
    });
  }

  private toSubscription(id: string, raw: Record<string, unknown>): StripeSubscription {
    return {
      id,
      status: (raw['status'] as SubscriptionStatus | undefined) ?? 'incomplete',
      priceId: (raw['price'] as { id?: string } | undefined)?.id ??
        ((raw['items'] as { 0?: { price?: { id?: string } } } | undefined)?.[0]?.price?.id ?? ''),
      productId: (raw['product'] as string | undefined) ??
        ((raw['items'] as { 0?: { price?: { product?: string } } } | undefined)?.[0]?.price?.product ?? ''),
      currentPeriodStart: (raw['current_period_start'] as { seconds?: number } | undefined)?.seconds ?? 0,
      currentPeriodEnd: (raw['current_period_end'] as { seconds?: number } | undefined)?.seconds ?? 0,
      cancelAtPeriodEnd: Boolean(raw['cancel_at_period_end']),
      trialEnd: (raw['trial_end'] as { seconds?: number } | undefined)?.seconds ?? null
    };
  }

  private compareSubscriptions(a: StripeSubscription, b: StripeSubscription): number {
    const priorityDiff =
      (StripeService.SUBSCRIPTION_PRIORITY[a.status] ?? Number.MAX_SAFE_INTEGER) -
      (StripeService.SUBSCRIPTION_PRIORITY[b.status] ?? Number.MAX_SAFE_INTEGER);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return b.currentPeriodEnd - a.currentPeriodEnd;
  }
}
