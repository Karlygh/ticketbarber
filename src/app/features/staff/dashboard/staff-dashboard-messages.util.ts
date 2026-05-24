export const STAFF_PERMISSION_SUPPORT_MESSAGE =
  'Permiso denegado en Firebase. Revisa que estas con la cuenta duena del negocio y que las reglas esten desplegadas en el proyecto activo ticketbarber-7c16d.';

export const STAFF_WARNING_MESSAGES = {
  closedDay: 'Para cambiar la direccion de la jornada, abre jornada primero.',
  closeDayWithoutOpen: 'Para cerrar jornada, primero tienes que iniciar una jornada activa.'
} as const;

export function toStaffSupportMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : fallback;
  const normalized = raw.toLowerCase();

  if (
    normalized.includes('insufficient permissions') ||
    normalized.includes('storage/unauthorized') ||
    normalized.includes('permission_denied')
  ) {
    return STAFF_PERMISSION_SUPPORT_MESSAGE;
  }

  return raw || fallback;
}
