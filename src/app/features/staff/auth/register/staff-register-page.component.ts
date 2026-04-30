import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/stores/auth.store';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';

type ModalState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-staff-register-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './staff-register-page.component.html',
  styleUrl: './staff-register-page.component.css'
})
export class StaffRegisterPageComponent {
  private readonly router = inject(Router);
  readonly authStore = inject(AuthStore);
  readonly routes = APP_ROUTES;
  readonly modalState = signal<ModalState>('idle');
  readonly errorMsg = signal('');

  get isLoading() { return this.modalState() === 'loading'; }

  async register(): Promise<void> {
    this.errorMsg.set('');
    this.modalState.set('loading');
    try {
      await this.authStore.signInWithGoogle();
      this.modalState.set('success');
      setTimeout(() => this.router.navigateByUrl(this.routes.staff.root), 2500);
    } catch (err) {
      this.errorMsg.set(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
      this.modalState.set('error');
    }
  }

  closeError(): void {
    this.modalState.set('idle');
  }
}
