// ...existing code...
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../core/stores/subscription.store';
import { QueueStore } from '../../../core/stores/queue.store';
import { APP_ROUTES } from '../../../shared/routing/app-routes';
import { CustomerDetailModalComponent } from '../../../shared/components/customer-detail-modal.component';

type DestructiveAction =
  | {
      type: 'delete-ticket';
      ticketId: string;
      displayName: string;
      isCurrent: boolean;
    }
  | {
      type: 'close-day';
    };

@Component({
  selector: 'app-staff-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CustomerDetailModalComponent],
  templateUrl: './staff-page.component.html',
  styleUrl: './staff-page.component.css'
})
export class StaffPageComponent {
  showCustomerModal = false;
  selectedCustomer: any = null;

  openCustomerModal(ticket: any) {
    this.selectedCustomer = {
      name: ticket.displayName || ticket.customerName || '-',
      arrivalTime: this.formatArrivalTime(ticket.createdAtMs),
      phone: ticket.phone || '-'
    };
    this.showCustomerModal = true;
  }

  closeCustomerModal() {
    this.showCustomerModal = false;
    this.selectedCustomer = null;
  }
  private readonly router = inject(Router);
  private readonly arrivalTimeFormatter = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  readonly authStore = inject(AuthStore);
  readonly subscriptionStore = inject(SubscriptionStore);
  readonly queueStore = inject(QueueStore);
  readonly routes = APP_ROUTES;
  readonly tvQueueRoute = computed(() => {
    const shopId = this.authStore.user()?.uid;
    return shopId ? ['/tv', shopId] : ['/tv'];
  });
  readonly isBusy = signal(false);
  readonly error = signal('');
  readonly destructiveAction = signal<DestructiveAction | null>(null);
  readonly logoutState = signal<'idle' | 'confirm' | 'loading' | 'success'>('idle');

  constructor() {
    void this.queueStore.bootstrap();
  }

  async moveNext(): Promise<void> {
    await this.runAction(() => this.queueStore.moveNext());
  }

  async movePrevious(): Promise<void> {
    await this.runAction(() => this.queueStore.movePrevious());
  }

  async deleteTicket(ticketId: string, displayName: string, status: 'waiting' | 'current' | 'done'): Promise<void> {
    this.destructiveAction.set({
      type: 'delete-ticket',
      ticketId,
      displayName,
      isCurrent: status === 'current'
    });
  }

  async closeDay(): Promise<void> {
    this.destructiveAction.set({ type: 'close-day' });
  }

  async openDay(): Promise<void> {
    await this.runAction(() => this.queueStore.openDay());
  }

  requestLogout(): void {
    this.logoutState.set('confirm');
  }

  cancelLogout(): void {
    this.logoutState.set('idle');
  }

  async confirmLogout(): Promise<void> {
    this.logoutState.set('loading');
    try {
      await this.authStore.signOut();
      this.logoutState.set('success');
      setTimeout(() => this.router.navigateByUrl(this.routes.staff.login), 1800);
    } catch {
      this.logoutState.set('idle');
    }
  }

  cancelDestructiveAction(): void {
    if (this.isBusy()) {
      return;
    }
    this.destructiveAction.set(null);
  }

  destructiveTitle(): string {
    const action = this.destructiveAction();
    if (!action) {
      return '';
    }
    return action.type === 'delete-ticket' ? 'Eliminar cliente' : 'Cerrar jornada';
  }

  destructiveMessage(): string {
    const action = this.destructiveAction();
    if (!action) {
      return '';
    }

    if (action.type === 'delete-ticket') {
      return action.isCurrent
        ? `Vas a eliminar a ${action.displayName}. Está en turno actual y se llamará automáticamente al siguiente cliente.`
        : `Vas a eliminar a ${action.displayName} de la cola de espera.`;
    }

    return 'Si cierras jornada, se eliminarán los tickets del día y se reiniciará la cola.';
  }

  destructiveConfirmLabel(): string {
    const action = this.destructiveAction();
    if (!action) {
      return '';
    }
    return action.type === 'delete-ticket' ? 'Sí, eliminar' : 'Sí, cerrar jornada';
  }

  formatArrivalTime(timestampMs: number): string {
    if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
      return '--:--';
    }
    return this.arrivalTimeFormatter.format(new Date(timestampMs));
  }

  async confirmDestructiveAction(): Promise<void> {
    const action = this.destructiveAction();
    if (!action || this.isBusy()) {
      return;
    }

    if (action.type === 'delete-ticket') {
      await this.runAction(() => this.queueStore.deleteTicket(action.ticketId));
    } else {
      await this.runAction(() => this.queueStore.closeDay());
    }

    if (!this.error()) {
      this.destructiveAction.set(null);
    }
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.error.set('');
    this.isBusy.set(true);
    try {
      await action();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo completar la accion.');
    } finally {
      this.isBusy.set(false);
    }
  }
}
