import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthStore } from '../../core/stores/auth.store';
import { SubscriptionStore } from '../../core/stores/subscription.store';
import { StripeService } from '../../core/services/stripe.service';
import { StripePrice, StripeProduct } from '../../core/models/user.model';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { APP_ROUTES } from '../../shared/routing/app-routes';

export interface PricingProduct extends StripeProduct {
  prices: StripePrice[];
}

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './pricing-page.component.html',
  styleUrl: './pricing-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PricingPageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authStore = inject(AuthStore);
  readonly subscriptionStore = inject(SubscriptionStore);
  private readonly stripeService = inject(StripeService);
  private productsSub: Subscription | null = null;

  readonly routes = APP_ROUTES;

  readonly products = signal<PricingProduct[]>([]);
  readonly loading = signal(true);
  readonly productsError = signal<string | null>(null);
  readonly loadingPriceId = signal<string | null>(null);
  readonly checkoutError = signal<string | null>(null);
  readonly portalLoading = signal(false);
  readonly billingCycle = signal<'month' | 'year'>('month');
  /** Razón de llegada desde el guard: 'trial-expired' | 'subscription-required' | '' */
  readonly reason = signal('');
  readonly featuredProduct = computed(() => this.products().find((p) => p.active) ?? this.products()[0] ?? null);
  readonly validPrices = computed(() =>
    (this.featuredProduct()?.prices ?? []).filter(
      (p) => p.active && p.type === 'recurring' && (p.interval === 'month' || p.interval === 'year')
    )
  );
  readonly monthlyPrice = computed(() =>
    this.validPrices().find((p) => p.interval === 'month') ?? null
  );
  readonly yearlyPrice = computed(() =>
    this.validPrices().find((p) => p.interval === 'year') ?? null
  );
  readonly selectedPrice = computed(() => {
    const cycle = this.billingCycle();
    if (cycle === 'year') return this.yearlyPrice();
    return this.monthlyPrice();
  });

  ngOnInit(): void {
    const r = this.route.snapshot.queryParamMap.get('reason') ?? '';
    this.reason.set(r);
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.productsSub?.unsubscribe();
  }

  loadProducts(): void {
    this.productsSub?.unsubscribe();
    this.loading.set(true);
    this.productsError.set(null);

    this.productsSub = this.stripeService.getProducts().subscribe({
      next: (prods) => {
        this.products.set(prods as PricingProduct[]);
        if (!this.monthlyPrice() && this.yearlyPrice()) {
          this.billingCycle.set('year');
        } else if (!this.yearlyPrice() && this.monthlyPrice()) {
          this.billingCycle.set('month');
        }
        this.loading.set(false);
        this.triggerPendingCheckout();
      },
      error: () => {
        this.productsError.set('No se pudieron cargar los planes ahora mismo. Intentalo de nuevo.');
        this.loading.set(false);
      }
    });
  }

  private triggerPendingCheckout(): void {
    const pendingPriceId = sessionStorage.getItem('pendingPriceId');
    if (!pendingPriceId) return;
    const uid = this.authStore.user()?.uid;
    if (!uid) return;
    sessionStorage.removeItem('pendingPriceId');
    const price = this.products()
      .flatMap((p) => p.prices)
      .find((p) => p.id === pendingPriceId);
    if (price) {
      this.buy(price);
    }
  }

  parseFeatures(product: PricingProduct): string[] {
    const raw = product.metadata?.['features'];
    if (!raw) {
      return [
        'Cola digital en tiempo real',
        'Panel de staff completo',
        'Pantalla TV para clientes',
        'Tickets ilimitados',
        'Estadísticas de afluencia',
        'Soporte prioritario',
      ];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignorar error de parseo
    }
    return raw.split('|').map((f: string) => f.trim()).filter(Boolean);
  }

  savingsLabel(product: PricingProduct, price: StripePrice): string | null {
    if (price.interval !== 'year') return null;
    const monthly = product.prices.find(
      (p) => p.interval === 'month' && p.active
    );
    if (!monthly) return null;
    const annualEquivalent = monthly.unit_amount * 12;
    const savings = annualEquivalent - price.unit_amount;
    if (savings <= 0) return null;
    return `Ahorras ${(savings / 100).toFixed(0)} €`;
  }

  yearlySavingsPercent(): number | null {
    const monthly = this.monthlyPrice();
    const yearly = this.yearlyPrice();
    if (!monthly || !yearly) return null;
    const annualEquivalent = monthly.unit_amount * 12;
    if (annualEquivalent <= yearly.unit_amount) return null;
    return Math.round(((annualEquivalent - yearly.unit_amount) / annualEquivalent) * 100);
  }

  setBillingCycle(cycle: 'month' | 'year'): void {
    if (cycle === 'month' && !this.monthlyPrice()) {
      this.checkoutError.set('Ahora mismo no hay plan mensual disponible.');
      return;
    }
    if (cycle === 'year' && !this.yearlyPrice()) {
      this.checkoutError.set('Ahora mismo no hay plan anual disponible.');
      return;
    }
    this.checkoutError.set(null);
    this.billingCycle.set(cycle);
  }

  async buy(_price: StripePrice): Promise<void> {
    this.checkoutError.set(null);
    const expectedPrice = this.selectedPrice();
    if (!expectedPrice) {
      this.checkoutError.set(
        this.billingCycle() === 'year'
          ? 'No hay plan anual disponible en este momento.'
          : 'No hay plan mensual disponible en este momento.'
      );
      return;
    }
    const price = expectedPrice;

    if (this.subscriptionStore.isPro()) {
      await this.openPortal();
      return;
    }

    const uid = this.authStore.user()?.uid;
    if (!uid) {
      sessionStorage.setItem('pendingPriceId', price.id);
      this.router.navigate(['/staff/register'], {
        queryParams: { reason: 'auth-required', returnUrl: '/pricing' }
      });
      return;
    }

    this.loadingPriceId.set(price.id);
    try {
      await new Promise<void>((resolve, reject) => {
        this.stripeService.startCheckout(uid, price.id).subscribe({
          next: () => resolve(),
          error: (err) => reject(err)
        });
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar el pago';
      this.checkoutError.set(message);
    } finally {
      this.loadingPriceId.set(null);
    }
  }

  async openPortal(): Promise<void> {
    this.checkoutError.set(null);
    if (this.portalLoading()) return;
    this.portalLoading.set(true);
    try {
      await this.stripeService.createPortalSession();
    } catch (err) {
      console.error('[Pricing] Portal error:', err);
      this.checkoutError.set('No se pudo abrir el portal de gestión. Inténtalo más tarde.');
    } finally {
      this.portalLoading.set(false);
    }
  }

  intervalLabel(interval: string): string {
    return interval === 'year' ? 'año' : 'mes';
  }

  /** Salta el pago y continúa usando el trial activo. */
  continueTrial(): void {
    void this.router.navigateByUrl('/staff');
  }
}
