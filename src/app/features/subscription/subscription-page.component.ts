import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStore } from '../../core/stores/auth.store';
import { SubscriptionStore } from '../../core/stores/subscription.store';
import { StripeService } from '../../core/services/stripe.service';
import { StripePrice, StripeProduct } from '../../core/models/user.model';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

// Tarjetas de prueba Stripe:
// ✅ Pago exitoso:     4242 4242 4242 4242
// ❌ Pago rechazado:   4000 0000 0000 0002
// 🔐 Requiere 3DS:     4000 0025 0000 3155
// Fecha: cualquiera futura | CVC: cualquiera | ZIP: cualquiera

/**
 * Página de suscripción: carga productos + precios dinámicamente desde Firestore
 * y lanza el flujo de Stripe Checkout.
 * Ruta: /subscription
 */
@Component({
  selector: 'app-subscription-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './subscription-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './subscription-page.component.css'
})
export class SubscriptionPageComponent implements OnInit {
  private readonly router = inject(Router);
  readonly authStore = inject(AuthStore);
  private readonly stripeService = inject(StripeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly subscriptionStore = inject(SubscriptionStore);

  readonly products = signal<(StripeProduct & { prices: StripePrice[] })[]>([]);
  readonly productsLoading = signal(true);
  readonly productsError = signal<string | null>(null);
  readonly loadingPriceId = signal<string | null>(null);
  readonly checkoutError = signal<string | null>(null);
  readonly portalLoading = signal(false);

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productsLoading.set(true);
    this.productsError.set(null);

    this.stripeService.getProducts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (prods) => {
        this.products.set(prods);
        this.productsLoading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error cargando productos:', err);
        this.productsError.set('No se pudieron cargar los planes en este momento. Intentalo de nuevo.');
        this.productsLoading.set(false);
      }
    });
  }

  /** Parsea features desde metadata (JSON array o string separado por |). */
  parseFeatures(metadata: Record<string, string>): string[] {
    const raw = metadata['features'];
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return raw.split('|').map((f) => f.trim()).filter(Boolean);
    }
  }

  /** Formatea precio para UI: unit_amount viene en céntimos. */
  formatAmount(price: StripePrice): number {
    return price.unit_amount / 100;
  }

  /** Etiqueta de intervalo. */
  intervalLabel(price: StripePrice): string {
    if (price.interval === 'year') return '/ año';
    return '/ mes';
  }

  /** Determina si un precio es el "recomendado" (anual sobre mensual). */
  isRecommended(price: StripePrice): boolean {
    return price.interval === 'year';
  }

  /** Calcula ahorro anual comparando con el precio mensual del mismo producto. */
  savingsLabel(product: StripeProduct & { prices: StripePrice[] }, yearlyPrice: StripePrice): string | null {
    const monthly = product.prices.find((p) => p.interval === 'month');
    if (!monthly) return null;
    const annualCostMonthly = monthly.unit_amount * 12;
    const savings = (annualCostMonthly - yearlyPrice.unit_amount) / 100;
    if (savings <= 0) return null;
    return `Ahorra ${savings.toFixed(2).replace('.', ',')} € al año`;
  }

  async subscribe(price: StripePrice): Promise<void> {
    const user = this.authStore.user();
    if (!user) {
      void this.router.navigate(['/staff/login'], {
        queryParams: { reason: 'auth-required', returnUrl: '/subscription' }
      });
      return;
    }

    this.loadingPriceId.set(price.id);
    this.checkoutError.set(null);
    try {
      await this.stripeService.startCheckoutRedirect(user.uid, price.id);
    } catch (err: unknown) {
      this.checkoutError.set('No se pudo iniciar el pago. Inténtalo de nuevo.');
      console.error('Checkout error:', err);
      this.loadingPriceId.set(null);
      return;
    }
  }

  async openPortal(): Promise<void> {
    this.portalLoading.set(true);
    try {
      await this.stripeService.createPortalSession();
    } catch (err: unknown) {
      console.error('Portal error:', err);
      this.checkoutError.set('No se pudo abrir el portal de gestión. Inténtalo más tarde.');
    } finally {
      this.portalLoading.set(false);
    }
  }
}
