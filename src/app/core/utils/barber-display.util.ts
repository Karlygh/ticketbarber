import { BarberStatus } from '../models/barber.model';

export function barberInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function barberStatusLabel(status: BarberStatus): string {
  if (status === 'available') return 'Disponible';
  if (status === 'break') return 'Descanso';
  return 'Oculto';
}
