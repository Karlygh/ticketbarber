import { ChangeDetectionStrategy, Component, EnvironmentInjector, inject, runInInjectionContext, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { Payment } from '../../../core/models/user.model';
import { AuthStore } from '../../../core/stores/auth.store';
import { StripeService } from '../../../core/services/stripe.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-account-privacy-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, HeaderComponent, FooterComponent],
  templateUrl: './account-privacy-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './account-privacy-page.component.css'
})
export class AccountPrivacyPageComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly functions = inject(Functions);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);
  private readonly stripeService = inject(StripeService);
  private readonly fb = inject(FormBuilder);

  readonly user = this.authStore.user;

  // ── Export ──────────────────────────────────────────
  readonly exporting = signal(false);
  readonly exportError = signal<string | null>(null);

  // ── Delete account ───────────────────────────────────
  readonly deleteStep = signal<'idle' | 'confirm' | 'deleting' | 'error'>('idle');
  readonly deleteError = signal<string | null>(null);

  confirmForm: FormGroup = this.fb.group({
    confirmText: ['', [Validators.required, Validators.pattern(/^ELIMINAR$/)]]
  });

  private runInCtx<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  openDeleteConfirm(): void {
    this.confirmForm.reset();
    this.deleteStep.set('confirm');
  }

  cancelDelete(): void {
    this.deleteStep.set('idle');
  }

  async confirmDelete(): Promise<void> {
    if (this.confirmForm.invalid) return;
    this.deleteStep.set('deleting');
    this.deleteError.set(null);
    try {
      const deleteFn = this.runInCtx(() => httpsCallable(this.functions, 'deleteAccount'));
      await deleteFn({});
      await this.authStore.signOut();
      void this.router.navigateByUrl('/');
    } catch (err: unknown) {
      console.error('Error eliminando cuenta:', err);
      this.deleteError.set('No se pudo eliminar la cuenta. Contacta con soporte si el problema persiste.');
      this.deleteStep.set('error');
    }
  }

  async exportData(): Promise<void> {
    const uid = this.authStore.user()?.uid;
    const user = this.authStore.user();
    if (!uid || !user) return;

    this.exporting.set(true);
    this.exportError.set(null);
    try {
      // Perfil personal
      const profile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };

      // Historial de pagos
      const payments = await firstValueFrom(this.stripeService.getPayments(uid)).catch((): Payment[] => []);

      // Historial de tickets
      const ticketsCollection = this.runInCtx(() => collection(this.firestore, `shops/${uid}/tickets`));
      const ticketsSnap = await this.runInCtx(() => getDocs(ticketsCollection));
      const tickets = ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const exportObj = {
        exportedAt: new Date().toISOString(),
        profile,
        payments,
        tickets
      };

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticketbarber-datos-${uid.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Error exportando datos:', err);
      this.exportError.set('No se pudo exportar. Inténtalo de nuevo.');
    } finally {
      this.exporting.set(false);
    }
  }
}

