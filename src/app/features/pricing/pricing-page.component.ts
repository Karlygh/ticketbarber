import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthStore } from '../../core/stores/auth.store';
import { SubscriptionStore } from '../../core/stores/subscription.store';
import { StripeService } from '../../core/services/stripe.service';
import { StripePrice, StripeProduct } from '../../core/models/user.model';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

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
  readonly authStore = inject(AuthStore);
  readonly subscriptionStore = inject(SubscriptionStore);
  private readonly stripeService = inject(StripeService);
  private productsSub: Subscription | null = null;

  readonly products = signal<PricingProduct[]>([]);
  readonly loading = signal(true);
  readonly productsError = signal<string | null>(null);
  readonly loadingPriceId = signal<string | null>(null);
  readonly checkoutError = signal<string | null>(null);
  readonly portalLoading = signal(false);

  ngOnInit(): void {
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

  async buy(price: StripePrice): Promise<void> {
    this.checkoutError.set(null);

    if (this.subscriptionStore.isPro()) {
      await this.openPortal();
      return;
    }

    const uid = this.authStore.user()?.uid;
    if (!uid) {
      sessionStorage.setItem('pendingPriceId', price.id);
      this.router.navigate(['/staff/login'], {
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
    this.portalLoading.set(true);
    try {
      await this.stripeService.createPortalSession();
    } catch {
      // Portal se abre en nueva pestaña; error no crítico
    } finally {
      this.portalLoading.set(false);
    }
  }

  intervalLabel(interval: string): string {
    return interval === 'year' ? 'año' : 'mes';
  }
}
