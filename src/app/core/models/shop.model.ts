export interface OpeningHoursSlot {
  opens: string;   // 'HH:mm'
  closes: string;  // 'HH:mm'
}

export interface OpeningHoursDay {
  closed: boolean;
  slots: OpeningHoursSlot[]; // max 2 (manana/tarde)
}

// Legacy format kept for backward compatibility when reading old Firestore docs.
export interface LegacyOpeningHoursDay {
  opens: string;
  closes: string;
  closed: boolean;
}

/** Días de la semana en orden (índice = 0 Lunes … 6 Domingo) */
export const WEEK_DAYS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
] as const;

export interface ShopProfile {
  uid: string;
  shopName: string;
  logoUrl: string;
  description: string;
  address: string;
  phone: string;
  openingHours: OpeningHoursDay[];  // array de 7 elementos, índice 0 = Lunes
  updatedAt?: number;               // ms timestamp
}

export function defaultOpeningHours(): OpeningHoursDay[] {
  return WEEK_DAYS.map((_, i) => ({
    slots: [{ opens: '09:00', closes: '19:00' }],
    closed: i === 6  // Domingo cerrado por defecto
  }));
}
