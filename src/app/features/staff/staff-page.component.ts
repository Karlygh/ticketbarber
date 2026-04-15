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

  async logout(): Promise<void> {
    this.isBusy.set(true);
    try {
      await this.authStore.signOut();
      await this.router.navigateByUrl('/staff/login');
    } finally {
      this.isBusy.set(false);
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
