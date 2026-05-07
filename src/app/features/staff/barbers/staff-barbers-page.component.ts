import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BarberProfile } from '../../../core/models/barber.model';
import { BarberService } from '../../../core/services/barber.service';
import { QueueStore } from '../../../core/stores/queue.store';
import { APP_ROUTES } from '../../../shared/routing/app-routes';

@Component({
  selector: 'app-staff-barbers-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './staff-barbers-page.component.html',
  styleUrl: './staff-barbers-page.component.css'
})
export class StaffBarbersPageComponent {
  private readonly barberService = inject(BarberService);
  private readonly queueStore = inject(QueueStore);

  readonly routes = APP_ROUTES;
  readonly barbers = toSignal(this.barberService.observeBarbers(), { initialValue: [] as BarberProfile[] });

  readonly isBusy = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly editingBarberId = signal<string | null>(null);
  readonly editingName = signal('');
  readonly pendingPhotoFileName = signal('');
  readonly pendingPhotoUrl = signal<string | null>(null);

  readonly barberToDelete = signal<BarberProfile | null>(null);

  startEdit(barber: BarberProfile): void {
    this.clearBanners();
    this.editingBarberId.set(barber.id);
    this.editingName.set(barber.name);
    this.pendingPhotoUrl.set(barber.photoUrl ?? null);
    this.pendingPhotoFileName.set('');
  }

  cancelEdit(): void {
    if (this.isBusy()) return;
    this.editingBarberId.set(null);
    this.editingName.set('');
    this.pendingPhotoUrl.set(null);
    this.pendingPhotoFileName.set('');
  }

  isEditing(barberId: string): boolean {
    return this.editingBarberId() === barberId;
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    await this.runAction(async () => {
      const url = await this.barberService.uploadBarberPhoto(file);
      this.pendingPhotoUrl.set(url);
      this.pendingPhotoFileName.set(file.name);
    }, false);
  }

  async saveEdit(barber: BarberProfile): Promise<void> {
    const name = this.editingName().trim();
    if (!name) {
      this.error.set('El nombre del barbero es obligatorio.');
      return;
    }

    await this.runAction(async () => {
      await this.barberService.updateBarber(barber.id, {
        name,
        photoUrl: this.pendingPhotoUrl() ?? ''
      });
      this.success.set('Barbero actualizado correctamente.');
      this.cancelEdit();
    });
  }

  requestDelete(barber: BarberProfile): void {
    if (this.isBusy()) return;
    this.clearBanners();
    this.barberToDelete.set(barber);
  }

  cancelDelete(): void {
    if (this.isBusy()) return;
    this.barberToDelete.set(null);
  }

  async confirmDelete(): Promise<void> {
    const barber = this.barberToDelete();
    if (!barber) return;

    await this.runAction(async () => {
      await this.queueStore.cancelTicketsForBarber(barber.id);
      await this.barberService.deleteBarber(barber.id);
      this.barberToDelete.set(null);
      this.success.set('Barbero eliminado definitivamente.');
      if (this.editingBarberId() === barber.id) {
        this.cancelEdit();
      }
    });
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  private clearBanners(): void {
    this.error.set('');
    this.success.set('');
  }

  private async runAction(action: () => Promise<void>, clearFeedback = true): Promise<void> {
    if (clearFeedback) {
      this.clearBanners();
    }
    this.isBusy.set(true);
    try {
      await action();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo completar la accion.';
      this.error.set(message);
    } finally {
      this.isBusy.set(false);
    }
  }
}
