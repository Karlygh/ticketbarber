import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';

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
  readonly authStore = inject(AuthStore);
  readonly loginState = signal<LoginState>('idle');
  readonly errorMsg = signal('');

  get isLoading() { return this.loginState() === 'loading'; }

  async signIn(): Promise<void> {
    this.errorMsg.set('');
    this.loginState.set('loading');
    try {
      await this.authStore.signInWithGoogle();
      this.loginState.set('success');
      setTimeout(() => this.router.navigateByUrl('/staff'), 1800);
    } catch (err) {
      this.errorMsg.set(err instanceof Error ? err.message : 'No se pudo iniciar sesion.');
      this.loginState.set('error');
    }
  }
}
