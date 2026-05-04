export interface OpeningHoursDay {
  opens: string;   // 'HH:mm'
  closes: string;  // 'HH:mm'
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
    opens: '09:00',
    closes: '19:00',
    closed: i === 6  // Domingo cerrado por defecto
  }));
}
