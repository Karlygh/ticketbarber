import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionStore } from '../../core/stores/subscription.store';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-subscription-management-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './subscription-management-page.component.html',
  styleUrl: './subscription-management-page.component.css'
})
export class SubscriptionManagementPageComponent {
  readonly subscriptionStore = inject(SubscriptionStore);
  private readonly router = inject(Router);

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

  statusLabel(status: string): string {
    return this.statusLabels[status] ?? status;
  }

  goToPlans(): void {
    void this.router.navigateByUrl('/subscription');
  }
}
