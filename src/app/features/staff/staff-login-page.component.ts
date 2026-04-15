import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';

@Component({
  selector: 'app-staff-login-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff-login-page.component.html',
  styleUrl: './staff-login-page.component.css'
})
export class StaffLoginPageComponent {
  private readonly router = inject(Router);
  readonly authStore = inject(AuthStore);
  readonly isLoading = signal(false);
  readonly error = signal('');

  async signIn(): Promise<void> {
    this.error.set('');
    this.isLoading.set(true);
    try {
      await this.authStore.signInWithGoogle();
      await this.router.navigateByUrl('/staff');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo iniciar sesion.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
