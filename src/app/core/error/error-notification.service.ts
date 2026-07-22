import { Injectable, signal } from '@angular/core';

/**
 * Servicio singleton para propagar mensajes de error globales al AppComponent.
 * Se usa exclusivamente desde GlobalErrorHandler.
 */
@Injectable({ providedIn: 'root' })
export class ErrorNotificationService {
  readonly message = signal<string | null>(null);

  show(msg: string): void {
    this.message.set(msg);
  }

  clear(): void {
    this.message.set(null);
  }
}
