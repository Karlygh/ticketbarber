import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';
import { SubscriptionStore } from '../../core/stores/subscription.store';
import { StripeService } from '../../core/services/stripe.service';
import { Payment } from '../../core/models/user.model';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, UpperCasePipe, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './account-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './account-page.component.css'
})
export class AccountPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly stripeService = inject(StripeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly subscriptionStore = inject(SubscriptionStore);

  readonly user = this.authStore.user;
  readonly payments = signal<Payment[]>([]);
  readonly paymentsLoading = signal(true);
  readonly paymentsError = signal<string | null>(null);
  readonly portalLoading = signal(false);
  readonly portalError = signal<string | null>(null);

  readonly statusLabels: Record<string, string> = {
    active: 'Activo',
    trialing: 'En prueba',
    past_due: 'Pago pendiente',
    canceled: 'Cancelado',
    unpaid: 'Sin pagar',
    incomplete: 'Incompleto',
    incomplete_expired: 'Expirado',
    paused: 'Pausado'
  };

  ngOnInit(): void {
    const uid = this.authStore.user()?.uid;
    if (!uid) return;

    this.loadPayments();
  }

  loadPayments(): void {
    const uid = this.authStore.user()?.uid;
    if (!uid) return;

    this.paymentsLoading.set(true);
    this.paymentsError.set(null);

    this.stripeService.getPayments(uid).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (p) => {
        this.payments.set(p);
        this.paymentsLoading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error cargando pagos:', err);
        this.paymentsError.set('No se pudo cargar el historial de pagos. Intentalo de nuevo.');
        this.paymentsLoading.set(false);
      }
    });
  }

  statusLabel(status: string): string {
    return this.statusLabels[status] ?? status;
  }

  async openPortal(): Promise<void> {
    this.portalLoading.set(true);
    this.portalError.set(null);
    try {
      await this.stripeService.createPortalSession();
    } catch (err: unknown) {
      console.error('Portal error:', err);
      this.portalError.set('No se pudo abrir el portal de gestión. Inténtalo más tarde.');
    } finally {
      this.portalLoading.set(false);
    }
  }

  goToPlans(): void {
    void this.router.navigateByUrl('/pricing');
  }
}
