import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QueueStore } from '../../core/stores/queue.store';
import { AuthStore } from '../../core/stores/auth.store';
import { ShopService } from '../../core/services/shop.service';
import { TicketReceipt } from '../../core/models/ticket.model';
import { BarberService } from '../../core/services/barber.service';
import { BarberProfile } from '../../core/models/barber.model';
import { formatOpeningHoursForToday } from '../../core/utils/opening-hours.util';

@Component({
  selector: 'app-kiosk-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './kiosk-page.component.html',
  styleUrl: './kiosk-page.component.css'
})
export class KioskPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly authStore = inject(AuthStore);
  readonly queueStore = inject(QueueStore);
  private readonly shopService = inject(ShopService);
  private readonly barberService = inject(BarberService);

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
  readonly tvQueueRoute = computed(() => {
    const shopId = this.authStore.user()?.uid;
    return shopId ? ['/tv', shopId] : ['/tv'];
  });

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
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  selectBarber(barberId: string): void {
    this.form.controls.barberId.setValue(barberId);
    this.form.controls.barberId.markAsDirty();
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
    } catch (error) {
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
