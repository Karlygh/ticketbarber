export type BarberStatus = 'available' | 'break' | 'hidden';

export interface BarberProfile {
  id: string;
  name: string;
  photoUrl?: string;
  status: BarberStatus;
  isAvailableToday: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  sortOrder: number;
}

export interface CreateBarberInput {
  name: string;
  photoUrl?: string;
}
