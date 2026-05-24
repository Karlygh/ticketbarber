import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { sanitizeReturnUrl } from '../../../../core/auth/auth-navigation';
import { BrowserStorageService } from '../../../../core/services/browser-storage.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';

type ModalState = 'idle' | 'loading' | 'success' | 'returning' | 'error';

@Component({
  selector: 'app-staff-register-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './staff-register-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './staff-register-page.component.css'
})
export class StaffRegisterPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storage = inject(BrowserStorageService);
  readonly authStore = inject(AuthStore);
  readonly routes = APP_ROUTES;
  readonly modalState = signal<ModalState>('idle');
  readonly errorMsg = signal('');
  private redirectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.redirectTimeoutId !== null) {
        clearTimeout(this.redirectTimeoutId);
        this.redirectTimeoutId = null;
      }
    });
  }

  get isLoading() { return this.modalState() === 'loading'; }

  async register(): Promise<void> {
    this.errorMsg.set('');
    this.modalState.set('loading');
    try {
      const { isNewUser } = await this.authStore.signInWithGoogle();
      if (!isNewUser) {
        // Usuario ya existía → mostrar aviso y redirigir al panel
        this.modalState.set('returning');
        this.scheduleRedirect(this.resolvePostRegisterUrl(), 2800);
      } else {
        this.modalState.set('success');
        this.scheduleRedirect(this.resolvePostRegisterUrl(), 2500);
      }
    } catch (err: unknown) {
      this.errorMsg.set(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
      this.modalState.set('error');
    }
  }

  private resolvePostRegisterUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) return sanitizeReturnUrl(returnUrl);
    if (this.storage.getSessionItem('pendingPriceId')) return '/pricing';
    return this.routes.staff.root;
  }

  closeError(): void {
    this.modalState.set('idle');
  }

  private scheduleRedirect(url: string, delayMs: number): void {
    if (this.redirectTimeoutId !== null) {
      clearTimeout(this.redirectTimeoutId);
      this.redirectTimeoutId = null;
    }
    this.redirectTimeoutId = setTimeout(() => {
      this.redirectTimeoutId = null;
      void this.router.navigateByUrl(url);
    }, delayMs);
  }
}

