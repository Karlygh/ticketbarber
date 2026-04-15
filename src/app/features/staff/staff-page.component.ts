import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';
import { QueueStore } from '../../core/stores/queue.store';

@Component({
  selector: 'app-staff-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './staff-page.component.html',
  styleUrl: './staff-page.component.css'
})
export class StaffPageComponent {
  private readonly router = inject(Router);
  readonly authStore = inject(AuthStore);
  readonly queueStore = inject(QueueStore);
  readonly isBusy = signal(false);
  readonly error = signal('');
  readonly logoutState = signal<'idle' | 'confirm' | 'loading' | 'success'>('idle');

  constructor() {
    void this.queueStore.bootstrap();
  }

  async moveNext(): Promise<void> {
    await this.runAction(() => this.queueStore.moveNext());
  }

  async movePrevious(): Promise<void> {
    await this.runAction(() => this.queueStore.movePrevious());
  }

  async closeDay(): Promise<void> {
    const confirmed = window.confirm(
      'Si cierras jornada, se perderan los datos de tus clientes en el dia de hoy.'
    );
    if (!confirmed) {
      return;
    }
    await this.runAction(() => this.queueStore.closeDay());
  }

  async openDay(): Promise<void> {
    await this.runAction(() => this.queueStore.openDay());
  }

  requestLogout(): void {
    this.logoutState.set('confirm');
  }

  cancelLogout(): void {
    this.logoutState.set('idle');
  }

  async confirmLogout(): Promise<void> {
    this.logoutState.set('loading');
    try {
      await this.authStore.signOut();
      this.logoutState.set('success');
      setTimeout(() => this.router.navigateByUrl('/staff/login'), 1800);
    } catch {
      this.logoutState.set('idle');
    }
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.error.set('');
    this.isBusy.set(true);
    try {
      await action();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo completar la accion.');
    } finally {
      this.isBusy.set(false);
    }
  }
}
