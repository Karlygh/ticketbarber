import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../core/stores/subscription.store';
import { QueueStore } from '../../../core/stores/queue.store';
import { APP_ROUTES } from '../../../shared/routing/app-routes';
import { CustomerDetailModalComponent } from '../../../shared/components/customer-detail-modal.component';
import { BarberService } from '../../../core/services/barber.service';
import { BarberProfile, BarberStatus } from '../../../core/models/barber.model';
import { Ticket } from '../../../core/models/ticket.model';

@Component({
  selector: 'app-staff-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CustomerDetailModalComponent, FormsModule],
  templateUrl: './staff-page.component.html',
  styleUrl: './staff-page.component.css'
})
export class StaffPageComponent {
  private readonly router = inject(Router);
  private readonly arrivalTimeFormatter = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  readonly authStore = inject(AuthStore);
  readonly subscriptionStore = inject(SubscriptionStore);
  readonly queueStore = inject(QueueStore);
  private readonly barberService = inject(BarberService);
  readonly routes = APP_ROUTES;

  readonly barbers = toSignal(this.barberService.observeBarbers(), { initialValue: [] as BarberProfile[] });
  readonly activeBarbers = computed(() =>
    this.barbers().filter((barber) => this.queueStore.activeBarberIds().includes(barber.id))
  );
  readonly totalWaiting = computed(() =>
    this.activeBarbers().reduce((sum, barber) => sum + this.queueStore.waitingTicketsForBarber(barber.id).length, 0)
  );
  readonly currentTurnCount = computed(() =>
    this.activeBarbers().filter((barber) => this.queueStore.currentTicketForBarber(barber.id)).length
  );
  readonly availableTodayCount = computed(() =>
    this.barbers().filter((barber) => barber.isAvailableToday).length
  );
  readonly visibleBarbers = computed(() => this.barbers().filter((barber) => barber.status !== 'hidden'));
  readonly tvQueueRoute = computed(() => {
    const shopId = this.authStore.user()?.uid;
    return shopId ? ['/tv', shopId] : ['/tv'];
  });

  readonly isBusy = signal(false);
  readonly error = signal('');
  readonly logoutState = signal<'idle' | 'confirm' | 'loading' | 'success'>('idle');
  readonly showCustomerModal = signal(false);
  readonly selectedCustomer = signal<{ name: string; arrivalTime: string; phone: string } | null>(null);
  readonly showCreateBarberModal = signal(false);
  readonly showOpenDayModal = signal(false);
  readonly pendingBarberName = signal('');
  readonly pendingPhotoUrl = signal<string | null>(null);
  readonly pendingPhotoFileName = signal('');
  readonly openDaySelection = signal<Record<string, boolean>>({});
  readonly barberToDelete = signal<BarberProfile | null>(null);
  readonly openActionsBarberId = signal<string | null>(null);

  constructor() {
    void this.queueStore.bootstrap();
  }

  barberTickets(barberId: string): Ticket[] {
    return this.queueStore.ticketsForBarber(barberId);
  }

  barberCurrent(barberId: string): Ticket | null {
    return this.queueStore.currentTicketForBarber(barberId);
  }

  barberWaitingCount(barberId: string): number {
    return this.queueStore.waitingTicketsForBarber(barberId).length;
  }

  barberStatusLabel(status: BarberStatus): string {
    if (status === 'available') return 'Disponible';
    if (status === 'break') return 'Descanso';
    return 'Oculto';
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  formatArrivalTime(timestampMs: number): string {
    if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
      return '--:--';
    }
    return this.arrivalTimeFormatter.format(new Date(timestampMs));
  }

  openCustomerModal(ticket: Ticket): void {
    this.selectedCustomer.set({
      name: ticket.displayName || ticket.customerName || '-',
      arrivalTime: this.formatArrivalTime(ticket.createdAtMs),
      phone: ticket.phone || '-'
    });
    this.showCustomerModal.set(true);
  }

  closeCustomerModal(): void {
    this.showCustomerModal.set(false);
    this.selectedCustomer.set(null);
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

  openCreateBarberModal(): void {
    this.pendingBarberName.set('');
    this.pendingPhotoUrl.set(null);
    this.pendingPhotoFileName.set('');
    this.showCreateBarberModal.set(true);
  }

  closeCreateBarberModal(): void {
    if (this.isBusy()) return;
    this.showCreateBarberModal.set(false);
  }

  async onBarberPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.isBusy.set(true);
    this.error.set('');
    try {
      const url = await this.barberService.uploadBarberPhoto(file);
      this.pendingPhotoUrl.set(url);
      this.pendingPhotoFileName.set(file.name);
    } catch (err) {
      this.error.set(this.toSupportMessage(err, 'No se pudo subir la foto.'));
    } finally {
      this.isBusy.set(false);
    }
  }

  async createBarber(): Promise<void> {
    const name = this.pendingBarberName().trim();
    if (!name) return;
    await this.runAction(async () => {
      await this.barberService.createBarber({
        name,
        photoUrl: this.pendingPhotoUrl() ?? undefined
      });
      this.showCreateBarberModal.set(false);
    });
  }

  openAvailabilityModal(): void {
    const initial = this.barbers().reduce<Record<string, boolean>>((acc, barber) => {
      acc[barber.id] = barber.isAvailableToday || this.queueStore.activeBarberIds().includes(barber.id);
      return acc;
    }, {});
    this.openDaySelection.set(initial);
    this.showOpenDayModal.set(true);
  }

  toggleOpenDaySelection(barberId: string): void {
    this.openDaySelection.update((current) => ({
      ...current,
      [barberId]: !current[barberId]
    }));
  }

  async confirmOpenDay(): Promise<void> {
    const activeIds = Object.entries(this.openDaySelection())
      .filter(([, checked]) => checked)
      .map(([barberId]) => barberId);
    if (!activeIds.length) {
      this.error.set('Selecciona al menos un barbero disponible para abrir la jornada.');
      return;
    }
    await this.runAction(async () => {
      await this.barberService.setDailyAvailability(activeIds);
      await this.queueStore.openDay(activeIds);
      this.showOpenDayModal.set(false);
    });
  }

  async closeDay(): Promise<void> {
    await this.runAction(() => this.queueStore.closeDay());
  }

  async moveNext(barberId: string): Promise<void> {
    await this.runAction(() => this.queueStore.moveNext(barberId));
  }

  async movePrevious(barberId: string): Promise<void> {
    await this.runAction(() => this.queueStore.movePrevious(barberId));
  }

  async setBarberStatus(barberId: string, status: BarberStatus): Promise<void> {
    this.closeActionsMenu();
    await this.runAction(() => this.barberService.setBarberStatus(barberId, status));
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await this.runAction(() => this.queueStore.deleteTicket(ticketId));
  }

  requestDeleteBarber(barber: BarberProfile): void {
    this.closeActionsMenu();
    this.barberToDelete.set(barber);
  }

  cancelDeleteBarber(): void {
    if (this.isBusy()) return;
    this.barberToDelete.set(null);
  }

  async confirmDeleteBarber(): Promise<void> {
    const barber = this.barberToDelete();
    if (!barber) return;
    await this.runAction(async () => {
      await this.queueStore.cancelTicketsForBarber(barber.id);
      await this.barberService.deleteBarber(barber.id);
      this.barberToDelete.set(null);
    });
  }

  toggleActionsMenu(barberId: string): void {
    if (this.isBusy()) return;
    this.openActionsBarberId.update((current) => (current === barberId ? null : barberId));
  }

  isActionsMenuOpen(barberId: string): boolean {
    return this.openActionsBarberId() === barberId;
  }

  closeActionsMenu(): void {
    this.openActionsBarberId.set(null);
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.error.set('');
    this.isBusy.set(true);
    try {
      await action();
    } catch (err) {
      this.error.set(this.toSupportMessage(err, 'No se pudo completar la accion.'));
    } finally {
      this.isBusy.set(false);
    }
  }

  private toSupportMessage(error: unknown, fallback: string): string {
    const raw = error instanceof Error ? error.message : fallback;
    const normalized = raw.toLowerCase();
    if (
      normalized.includes('insufficient permissions') ||
      normalized.includes('storage/unauthorized') ||
      normalized.includes('permission_denied')
    ) {
      return 'Permiso denegado en Firebase. Revisa que estas con la cuenta duena del negocio y que las reglas esten desplegadas en el proyecto activo ticketbarber-7c16d.';
    }
    return raw || fallback;
  }
}
