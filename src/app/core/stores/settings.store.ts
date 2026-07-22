import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { QueueRepository } from '../data/queue.repository';
import { DEFAULT_QUEUE_SETTINGS } from '../models/settings.model';
import { logWarn } from '../utils/logger.util';

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly repository = inject(QueueRepository);
  private bootstrapped = false;

  readonly settings = toSignal(this.repository.observeSettings(), {
    initialValue: DEFAULT_QUEUE_SETTINGS
  });
  readonly isOpen = computed(() => this.settings().isOpen);

  async bootstrap(): Promise<void> {
    if (this.bootstrapped) {
      return;
    }
    this.bootstrapped = true;
    try {
      await this.repository.bootstrapDefaults();
    } catch (error: unknown) {
      // Kiosk/TV can run in read-only mode if Firestore rules deny bootstrap writes.
      // Staff view can still create defaults after authentication.
      logWarn('Bootstrap skipped due to Firestore permissions:', error);
    }
  }

  async closeDay(): Promise<void> {
    await this.repository.closeDay();
  }

  async openDay(activeBarberIds: string[]): Promise<void> {
    await this.repository.openDay(activeBarberIds);
  }
}
