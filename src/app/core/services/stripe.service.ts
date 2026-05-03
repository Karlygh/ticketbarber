import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  doc,
  updateDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import {
  CheckoutSession,
  Payment,
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
              product.prices = priceSnap.docs.map((d) => {
                const p = d.data();
                return {
                  id: d.id,
                  active: p['active'] ?? true,
                  currency: p['currency'] ?? 'eur',
                  unit_amount: p['unit_amount'] ?? 0,
                  type: p['type'] ?? 'recurring',
                  interval: p['interval'] ?? 'month',
                  interval_count: p['interval_count'] ?? 1,
                  product: p['product'] ?? productDoc.id
                } as StripePrice;
              });
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

      window.location.assign(result.data.url);
    } catch (err) {
      console.error('Error al crear portal de cliente:', err);
      throw new Error(
        'No se pudo abrir el portal de gestión. Asegúrate de que el Customer Portal de Stripe está configurado.'
      );
    }
  }

  // ── Suscripciones ──────────────────────────────────────────────────────

  /** Devuelve la suscripción activa más reciente del usuario. */
  getActiveSubscription(uid: string): Observable<StripeSubscription | null> {
    return new Observable<StripeSubscription | null>((subscriber) => {
      const subsRef = collection(this.firestore, `customers/${uid}/subscriptions`);
      const q = query(
        subsRef,
        where('status', 'in', ['active', 'trialing']),
        orderBy('currentPeriodEnd', 'desc'),
        limit(1)
      );

      const unsub = onSnapshot(
        q,
        (snap) => {
          if (snap.empty) {
            subscriber.next(null);
            return;
          }
          const raw = snap.docs[0].data();
          const sub: StripeSubscription = {
            id: snap.docs[0].id,
            status: raw['status'],
            priceId: raw['price']?.id ?? raw['items']?.[0]?.price?.id ?? '',
            productId: raw['product'] ?? raw['items']?.[0]?.price?.product ?? '',
            currentPeriodStart: raw['current_period_start']?.seconds ?? 0,
            currentPeriodEnd: raw['current_period_end']?.seconds ?? 0,
            cancelAtPeriodEnd: raw['cancel_at_period_end'] ?? false,
            trialEnd: raw['trial_end']?.seconds ?? null
          };
          subscriber.next(sub);
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
      const q = query(subsRef, orderBy('currentPeriodEnd', 'desc'));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const subs: StripeSubscription[] = snap.docs.map((d) => {
            const raw = d.data();
            return {
              id: d.id,
              status: raw['status'],
              priceId: raw['price']?.id ?? raw['items']?.[0]?.price?.id ?? '',
              productId: raw['product'] ?? raw['items']?.[0]?.price?.product ?? '',
              currentPeriodStart: raw['current_period_start']?.seconds ?? 0,
              currentPeriodEnd: raw['current_period_end']?.seconds ?? 0,
              cancelAtPeriodEnd: raw['cancel_at_period_end'] ?? false,
              trialEnd: raw['trial_end']?.seconds ?? null
            } as StripeSubscription;
          });
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
}
