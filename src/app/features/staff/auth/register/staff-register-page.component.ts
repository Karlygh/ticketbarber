import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/stores/auth.store';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';

type ModalState = 'idle' | 'loading' | 'success' | 'returning' | 'error';

@Component({
  selector: 'app-staff-register-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './staff-register-page.component.html',
  styleUrl: './staff-register-page.component.css'
})
export class StaffRegisterPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authStore = inject(AuthStore);
  readonly routes = APP_ROUTES;
  readonly modalState = signal<ModalState>('idle');
  readonly errorMsg = signal('');

  get isLoading() { return this.modalState() === 'loading'; }

  async register(): Promise<void> {
    this.errorMsg.set('');
    this.modalState.set('loading');
    try {
      const { isNewUser } = await this.authStore.signInWithGoogle();
      if (!isNewUser) {
        // Usuario ya existía → mostrar aviso y redirigir al panel
        this.modalState.set('returning');
        setTimeout(() => this.router.navigateByUrl(this.resolvePostRegisterUrl()), 2800);
      } else {
        this.modalState.set('success');
        setTimeout(() => this.router.navigateByUrl(this.resolvePostRegisterUrl()), 2500);
      }
    } catch (err) {
      this.errorMsg.set(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
      this.modalState.set('error');
    }
  }

  private resolvePostRegisterUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) return returnUrl;
    if (sessionStorage.getItem('pendingPriceId')) return '/pricing';
    return this.routes.staff.root;
  }

  closeError(): void {
    this.modalState.set('idle');
  }
}
