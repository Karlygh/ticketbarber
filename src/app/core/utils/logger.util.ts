/* eslint-disable no-console */
/**
 * Utilidad de logging condicional.
 * En producción (environment.production = true) todas las funciones son no-ops,
 * por lo que el compilador con tree-shaking elimina las llamadas del bundle final.
 */
import { environment } from '../../../environments/environment';

const isDev = !environment.production;

export function logError(message: string, ...args: unknown[]): void {
  if (isDev) console.error(message, ...args);
}

export function logWarn(message: string, ...args: unknown[]): void {
  if (isDev) console.warn(message, ...args);
}

export function logInfo(message: string, ...args: unknown[]): void {
  if (isDev) console.info(message, ...args);
}
