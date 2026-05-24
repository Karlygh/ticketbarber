import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../core/stores/subscription.store';
import { QueueStore } from '../../../core/stores/queue.store';
import { APP_ROUTES, buildTvQueueRouteCommands } from '../../../shared/routing/app-routes';
import { CustomerDetailModalComponent, CustomerDetailViewModel } from '../../../shared/components/customer-detail-modal.component';
import { BarberService } from '../../../core/services/barber.service';
import { BarberProfile, BarberStatus } from '../../../core/models/barber.model';
import { Ticket } from '../../../core/models/ticket.model';
import { ShopService } from '../../../core/services/shop.service';
import { barberInitials, barberStatusLabel } from '../../../core/utils/barber-display.util';
import {
  STAFF_WARNING_MESSAGES,
  toStaffSupportMessage
} from './staff-dashboard-messages.util';
import {
  activeTicketsForBarber,
  buildStaffCustomerDetail,
  doneTicketsForBarber
} from './staff-queue-view.util';

@Component({
  selector: 'app-staff-page',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, CustomerDetailModalComponent, FormsModule],
  templateUrl: './staff-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './staff-page.component.css'
})
export class StaffPageComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly arrivalTimeFormatter = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  readonly authStore = inject(AuthStore);
  readonly subscriptionStore = inject(SubscriptionStore);
  readonly queueStore = inject(QueueStore);
  private readonly barberService = inject(BarberService);
  private readonly shopService = inject(ShopService);
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
  private readonly shopNameState = signal('');
  readonly welcomeName = computed(() => this.shopNameState().trim());
  readonly tvQueueRoute = computed(() => buildTvQueueRouteCommands(this.authStore.user()?.uid));

  readonly isBusy = signal(false);
  readonly error = signal('');
  readonly logoutState = signal<'idle' | 'confirm' | 'loading' | 'success'>('idle');
  readonly showCustomerModal = signal(false);
  readonly selectedCustomer = signal<CustomerDetailViewModel | null>(null);
  readonly showCreateBarberModal = signal(false);
  readonly showOpenDayModal = signal(false);
  readonly pendingBarberName = signal('');
  readonly pendingPhotoUrl = signal<string | null>(null);
  readonly pendingPhotoFileName = signal('');
  readonly openDaySelection = signal<Record<string, boolean>>({});
  readonly showCloseDayConfirmModal = signal(false);
  readonly barberToDelete = signal<BarberProfile | null>(null);
  readonly openActionsBarberId = signal<string | null>(null);
  readonly showBarberDetailModal = signal(false);
  readonly selectedBarber = signal<BarberProfile | null>(null);
  readonly warningToastMessage = signal('');
  readonly showWarningToast = signal(false);
  private warningToastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.queueStore.bootstrap();
    effect(() => {
      const uid = this.authStore.user()?.uid;
      if (!uid) {
        this.shopNameState.set('');
        return;
      }
      void this.loadShopName(uid);
    });
    this.destroyRef.onDestroy(() => {
      if (this.warningToastTimeoutId) {
        clearTimeout(this.warningToastTimeoutId);
        this.warningToastTimeoutId = null;
      }
    });
  }

  barberTickets(barberId: string): Ticket[] {
    return this.queueStore.ticketsForBarber(barberId);
  }

  activeTicketsForBarber(barberId: string): Ticket[] {
    return activeTicketsForBarber(this.queueStore.tickets(), barberId);
  }

  doneTicketsForBarber(barberId: string): Ticket[] {
    return doneTicketsForBarber(this.queueStore.tickets(), barberId);
  }

  barberCurrent(barberId: string): Ticket | null {
    return this.queueStore.currentTicketForBarber(barberId);
  }

  barberWaitingCount(barberId: string): number {
    return this.queueStore.waitingTicketsForBarber(barberId).length;
  }

  isBarberActive(barberId: string): boolean {
    return this.queueStore.activeBarberIds().includes(barberId);
  }

  barberStatusLabel(status: BarberStatus): string {
    return barberStatusLabel(status);
  }

  initials(name: string): string {
    return barberInitials(name);
  }

  formatArrivalTime(timestampMs: number): string {
    if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
      return '--:--';
    }
    return this.arrivalTimeFormatter.format(new Date(timestampMs));
  }

  openCustomerModal(ticket: Ticket): void {
    this.selectedCustomer.set(buildStaffCustomerDetail(ticket, (timestampMs) => this.formatArrivalTime(timestampMs)));
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
    } catch (err: unknown) {
      this.error.set(toStaffSupportMessage(err, 'No se pudo subir la foto.'));
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
    this.showCloseDayConfirmModal.set(false);
    await this.runAction(() => this.queueStore.closeDay());
  }

  requestCloseDay(): void {
    if (this.isBusy()) return;
    if (!this.queueStore.settings().isOpen) {
      this.showCloseDayWithoutOpenWarning();
      return;
    }
    this.showCloseDayConfirmModal.set(true);
  }

  cancelCloseDay(): void {
    if (this.isBusy()) return;
    this.showCloseDayConfirmModal.set(false);
  }

  async moveNext(barberId: string): Promise<void> {
    if (!this.queueStore.settings().isOpen) {
      this.showClosedDayWarning();
      return;
    }
    await this.runAction(() => this.queueStore.moveNext(barberId));
  }

  async movePrevious(barberId: string): Promise<void> {
    if (!this.queueStore.settings().isOpen) {
      this.showClosedDayWarning();
      return;
    }
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

  openBarberDetailModal(barber: BarberProfile): void {
    this.closeActionsMenu();
    this.selectedBarber.set(barber);
    this.showBarberDetailModal.set(true);
  }

  openBarberDetailFromKeyboard(event: KeyboardEvent, barber: BarberProfile): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    this.openBarberDetailModal(barber);
  }

  closeBarberDetailModal(): void {
    this.showBarberDetailModal.set(false);
    this.selectedBarber.set(null);
  }

  private async loadShopName(uid: string): Promise<void> {
    try {
      const profile = await this.shopService.getShopProfile(uid);
      this.shopNameState.set(profile?.shopName?.trim() || '');
    } catch {
      this.shopNameState.set('');
    }
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.error.set('');
    this.isBusy.set(true);
    try {
      await action();
    } catch (err: unknown) {
      this.error.set(toStaffSupportMessage(err, 'No se pudo completar la accion.'));
    } finally {
      this.isBusy.set(false);
    }
  }

  private showClosedDayWarning(): void {
    this.warningToastMessage.set(STAFF_WARNING_MESSAGES.closedDay);
    this.showWarningToastWithAutoClose();
  }

  private showCloseDayWithoutOpenWarning(): void {
    this.warningToastMessage.set(STAFF_WARNING_MESSAGES.closeDayWithoutOpen);
    this.showWarningToastWithAutoClose();
  }

  private showWarningToastWithAutoClose(): void {
    this.showWarningToast.set(true);
    if (this.warningToastTimeoutId) {
      clearTimeout(this.warningToastTimeoutId);
    }
    this.warningToastTimeoutId = setTimeout(() => {
      this.showWarningToast.set(false);
      this.warningToastTimeoutId = null;
    }, 2800);
  }
}

