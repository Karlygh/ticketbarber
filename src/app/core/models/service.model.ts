export interface BarberService {
  id: string;
  name: string;
  durationMin: number;
  active: boolean;
}

export const DEFAULT_SERVICES: Omit<BarberService, 'id'>[] = [
  { name: 'Corte clasico', durationMin: 25, active: true },
  { name: 'Corte + barba', durationMin: 40, active: true },
  { name: 'Arreglo de barba', durationMin: 20, active: true }
];
