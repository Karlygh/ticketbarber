import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { sanitizeReturnUrl } from '../../../../core/auth/auth-navigation';
import { AuthStore } from '../../../../core/stores/auth.store';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';

type LoginState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-staff-login-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './staff-login-page.component.html',
  styleUrl: './staff-login-page.component.css'
})
export class StaffLoginPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authStore = inject(AuthStore);
  readonly routes = APP_ROUTES;
  readonly loginState = signal<LoginState>('idle');
  readonly errorMsg = signal('');
  readonly accessReason = signal(this.route.snapshot.queryParamMap.get('reason') ?? '');

  get isLoading() { return this.loginState() === 'loading'; }
  get showAuthRequiredNotice() { return this.accessReason() === 'auth-required'; }

  async signIn(): Promise<void> {
    this.errorMsg.set('');
    this.loginState.set('loading');
    try {
      await this.authStore.signInWithGoogle();
      this.loginState.set('success');
      const safeUrl = sanitizeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
      setTimeout(() => this.router.navigateByUrl(safeUrl), 1800);
    } catch (err) {
      this.errorMsg.set(this.toMessage(err));
      this.loginState.set('error');
    }
  }

  private toMessage(error: unknown): string {
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string'
        ? (error as { code: string }).code
        : '';

    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Has cerrado la ventana de Google antes de terminar. Vuelve a intentarlo.';
      case 'auth/popup-blocked':
      case 'auth/cancelled-popup-request':
        return 'Tu navegador ha bloqueado la ventana de acceso. Permite popups y prueba de nuevo.';
      case 'auth/network-request-failed':
        return 'No se ha podido conectar con Google. Revisa tu conexion e intentalo otra vez.';
      case 'auth/operation-not-allowed':
      case 'auth/unauthorized-domain':
      case 'auth/app-not-authorized':
      case 'auth/invalid-api-key':
        return 'El acceso con Google no esta bien configurado todavia. Revisa Firebase antes de continuar.';
      default:
        return 'No se pudo iniciar sesion con Google. Intentalo de nuevo en unos segundos.';
    }
  }
}
