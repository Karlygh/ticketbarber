import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QueueStore } from '../../core/stores/queue.store';
import { AuthStore } from '../../core/stores/auth.store';
import { ShopService } from '../../core/services/shop.service';
import { TicketReceipt } from '../../core/models/ticket.model';
import { BarberService } from '../../core/services/barber.service';
import { BarberProfile } from '../../core/models/barber.model';
import { barberInitials } from '../../core/utils/barber-display.util';
import { formatOpeningHoursForToday } from '../../core/utils/opening-hours.util';
import { buildTvQueueRouteCommands } from '../../shared/routing/app-routes';

@Component({
  selector: 'app-kiosk-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ],
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
    this.isSubmitting.set(true);
    try {
      const receipt = await this.queueStore.createTicket({
        barberId,
        customerName,
        serviceId,
        phone: phone?.trim() || undefined
      });
      this.receipt.set(receipt);
      this.form.reset({
        barberId,
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

