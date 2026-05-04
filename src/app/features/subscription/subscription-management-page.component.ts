import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { AuthStore } from '../../core/stores/auth.store';
import { SubscriptionStore } from '../../core/stores/subscription.store';
import { StripeService } from '../../core/services/stripe.service';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

const CANCEL_REASONS = [
  'El precio es muy alto',
  'No lo uso suficiente',
  'Le falta alguna función que necesito',
  'Cambié a otra herramienta',
  'Cerré el negocio',
  'Otro motivo'
] as const;

@Component({
  selector: 'app-subscription-management-page',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, ReactiveFormsModule, HeaderComponent, FooterComponent],
  templateUrl: './subscription-management-page.component.html',
  styleUrl: './subscription-management-page.component.css'
})
export class SubscriptionManagementPageComponent {
  readonly subscriptionStore = inject(SubscriptionStore);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly stripeService = inject(StripeService);
  private readonly firestore = inject(Firestore);
  private readonly fb = inject(FormBuilder);

  readonly cancelReasons = CANCEL_REASONS;

  readonly portalLoading = signal(false);
  readonly portalError = signal<string | null>(null);

  readonly cancelModalOpen = signal(false);
  readonly cancelSending = signal(false);
  readonly cancelError = signal<string | null>(null);

  readonly cancelForm: FormGroup = this.fb.group({
    reason:  ['', Validators.required],
    comment: ['', Validators.maxLength(300)]
  });

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

  async openPortal(): Promise<void> {
    this.portalLoading.set(true);
    this.portalError.set(null);
    try {
      await this.stripeService.createPortalSession();
    } catch (err) {
      console.error('Portal error:', err);
      this.portalError.set('No se pudo abrir el portal. Inténtalo más tarde.');
    } finally {
      this.portalLoading.set(false);
    }
  }

  openCancelModal(): void {
    this.cancelForm.reset();
    this.cancelError.set(null);
    this.cancelModalOpen.set(true);
  }

  closeCancelModal(): void {
    this.cancelModalOpen.set(false);
  }

  async submitCancelFeedback(): Promise<void> {
    if (this.cancelForm.invalid) return;
    const uid = this.authStore.user()?.uid;
    if (!uid) return;

    this.cancelSending.set(true);
    this.cancelError.set(null);
    try {
      const { reason, comment } = this.cancelForm.value as { reason: string; comment: string };
      await setDoc(doc(this.firestore, `cancellation_feedback/${uid}`), {
        uid,
        reason,
        comment: comment?.trim() || '',
        createdAt: Date.now()
      });
      this.cancelModalOpen.set(false);
      await this.openPortal();
    } catch (err) {
      console.error('Error guardando feedback:', err);
      this.cancelError.set('No se pudo guardar el motivo. Inténtalo de nuevo.');
    } finally {
      this.cancelSending.set(false);
    }
  }
}
