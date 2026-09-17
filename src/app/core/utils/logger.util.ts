/* eslint-disable no-console */
/**
 * Utilidad de logging condicional.
 * logWarn/logInfo son no-ops en producción (ruido no crítico).
 * logError SIEMPRE imprime, incluso en producción: es la única forma de
 * diagnosticar errores reales en el entorno donde realmente ocurren, y no
 * expone nada que el usuario no pueda ya ver en el aviso de error.
 */
import { environment } from '../../../environments/environment';

const isDev = !environment.production;

export function logError(message: string, ...args: unknown[]): void {
  console.error(message, ...args);
}

export function logWarn(message: string, ...args: unknown[]): void {
  if (isDev) console.warn(message, ...args);
}

export function logInfo(message: string, ...args: unknown[]): void {
  if (isDev) console.info(message, ...args);
}
