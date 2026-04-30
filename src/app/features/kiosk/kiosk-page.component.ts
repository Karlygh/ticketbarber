import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QueueStore } from '../../core/stores/queue.store';
import { AuthStore } from '../../core/stores/auth.store';
import { TicketReceipt } from '../../core/models/ticket.model';

@Component({
  selector: 'app-kiosk-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './kiosk-page.component.html',
  styleUrl: './kiosk-page.component.css'
})
export class KioskPageComponent {
  private readonly fb = inject(FormBuilder);
  readonly authStore = inject(AuthStore);
  readonly queueStore = inject(QueueStore);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly receipt = signal<TicketReceipt | null>(null);
  readonly tvQueueRoute = computed(() => {
    const shopId = this.authStore.user()?.uid;
    return shopId ? ['/tv', shopId] : ['/tv'];
  });

  readonly form = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(2)]],
    serviceId: ['', [Validators.required]],
    phone: ['']
  });

  async submitTicket(): Promise<void> {
    this.errorMessage.set('');
    this.receipt.set(null);

    if (this.form.invalid || !this.queueStore.settings().isOpen) {
      this.form.markAllAsTouched();
      return;
    }

    const { customerName, serviceId, phone } = this.form.getRawValue();
    this.isSubmitting.set(true);
    try {
      const receipt = await this.queueStore.createTicket({
        customerName,
        serviceId,
        phone: phone?.trim() || undefined
      });
      this.receipt.set(receipt);
      this.form.reset({
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
