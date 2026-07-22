import { ErrorHandler, Injectable, NgZone, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { logError } from '../utils/logger.util';
import { ErrorNotificationService } from './error-notification.service';

/**
 * Errores esperados que no deben mostrarse al usuario como error catastrófico.
 * Son errores conocidos del flujo normal (popup cerrado, conexión momentánea, etc.)
 */
const IGNORED_PATTERNS = [
  'ResizeObserver loop',
  'Non-Error exception captured',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/popup-blocked',
  'ChunkLoadError',
];

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notify = inject(ErrorNotificationService);
  private readonly zone = inject(NgZone);

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    logError('[GlobalErrorHandler]', error);

    if (IGNORED_PATTERNS.some((p) => message.includes(p))) {
      return;
    }

    if (environment.production) {
      this.zone.run(() =>
        this.notify.show('Algo fue mal. Recarga la página si el problema persiste.')
      );
    }
  }
}
