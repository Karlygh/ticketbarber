import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QueueStore } from '../../core/stores/queue.store';
import { AuthStore } from '../../core/stores/auth.store';
import { ShopService } from '../../core/services/shop.service';
import { CreateTicketInput, TicketReceipt } from '../../core/models/ticket.model';
import { BarberService } from '../../core/services/barber.service';
import { BarberProfile } from '../../core/models/barber.model';
import { barberInitials } from '../../core/utils/barber-display.util';
import { formatOpeningHoursForToday } from '../../core/utils/opening-hours.util';
import { buildTvQueueRouteCommands } from '../../shared/routing/app-routes';

@Component({
  selector: 'app-kiosk-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './kiosk-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './kiosk-page.component.css'
})
export class KioskPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly authStore = inject(AuthStore);
  readonly queueStore = inject(QueueStore);
  private readonly shopService = inject(ShopService);
  private readonly barberService = inject(BarberService);
  readonly navConfirmTarget = signal<'staff' | 'tv' | null>(null);
  readonly breakConfirmVisible = signal(false);
  private readonly pendingTicketPayload = signal<CreateTicketInput | null>(null);

  readonly shopName = signal<string>('');
  readonly shopLogoUrl = signal<string>('');
  readonly todayHours = signal<string>('Cerrado');
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly receipt = signal<TicketReceipt | null>(null);
  readonly barbers = toSignal(this.barberService.observeBarbers(), { initialValue: [] as BarberProfile[] });
  readonly availableBarbers = computed(() =>
    this.barbers().filter((barber) => barber.isAvailableToday && barber.status !== 'hidden')
  );
  readonly tvQueueRoute = computed(() => buildTvQueueRouteCommands(this.authStore.user()?.uid));

  readonly form = this.fb.nonNullable.group({
    barberId: ['', [Validators.required]],
    serviceId: ['', [Validators.required]],
    customerName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['']
  });

  ngOnInit(): void {
    const uid = this.authStore.user()?.uid;
    if (uid) {
      void this.shopService.getShopProfile(uid).then(profile => {
        if (profile) {
          this.shopName.set(profile.shopName || '');
          this.shopLogoUrl.set(profile.logoUrl || '');
          this.todayHours.set(formatOpeningHoursForToday(profile.openingHours, new Date(), 'Europe/Madrid'));
        }
      });
    }
  }

  initials(name: string): string {
    return barberInitials(name);
  }

  selectBarber(barberId: string): void {
    this.form.controls.barberId.setValue(barberId);
    this.form.controls.barberId.markAsDirty();
  }

  openStaffConfirm(): void {
    this.navConfirmTarget.set('staff');
  }

  openTvConfirm(): void {
    this.navConfirmTarget.set('tv');
  }

  closeNavConfirm(): void {
    this.navConfirmTarget.set(null);
  }

  async proceedWithNavigation(): Promise<void> {
    const target = this.navConfirmTarget();
    if (!target) {
      return;
    }

    this.navConfirmTarget.set(null);
    if (target === 'staff') {
      await this.router.navigate(['/staff']);
      return;
    }

    await this.router.navigate(this.tvQueueRoute());
  }

  navConfirmTitle(): string {
    return this.navConfirmTarget() === 'staff' ? 'Acceso al panel staff' : 'Abrir pantalla TV';
  }

  navConfirmMessage(): string {
    if (this.navConfirmTarget() === 'staff') {
      return 'Vas a entrar al panel staff de barberos. Esta zona es de uso interno y no esta pensada para clientes.';
    }
    return 'Vas a abrir la pantalla TV del negocio. Esta vista es para mostrar turnos y no para registrar tickets de clientes.';
  }

  async submitTicket(): Promise<void> {
    this.errorMessage.set('');
    this.receipt.set(null);

    if (this.form.invalid || !this.queueStore.settings().isOpen) {
      this.form.markAllAsTouched();
      return;
    }

    const { barberId, customerName, serviceId, phone } = this.form.getRawValue();
    const payload: CreateTicketInput = {
      barberId,
      customerName,
      serviceId,
      phone: phone?.trim() || undefined
    };

    const barber = this.barbers().find((b) => b.id === barberId);
    if (barber?.status === 'break') {
      this.pendingTicketPayload.set(payload);
      this.breakConfirmVisible.set(true);
      return;
    }

    await this.createTicketAndShowReceipt(payload);
  }

  async confirmBreakAndCreateTicket(): Promise<void> {
    const payload = this.pendingTicketPayload();
    this.breakConfirmVisible.set(false);
    this.pendingTicketPayload.set(null);
    if (!payload) return;
    await this.createTicketAndShowReceipt(payload);
  }

  cancelBreakConfirm(): void {
    this.breakConfirmVisible.set(false);
    this.pendingTicketPayload.set(null);
  }

  private async createTicketAndShowReceipt(payload: CreateTicketInput): Promise<void> {
    this.isSubmitting.set(true);
    try {
      const receipt = await this.queueStore.createTicket(payload);
      this.receipt.set(receipt);
      this.form.reset({
        barberId: payload.barberId,
        customerName: '',
        serviceId: '',
        phone: ''
      });
    } catch (error: unknown) {
      this.errorMessage.set(this.toMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private toMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'No se pudo crear el ticket. Intentalo de nuevo.';
  }
}

