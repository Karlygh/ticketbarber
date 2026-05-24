import { OpeningHoursDay } from '../models/shop.model';

const TV_BARBER_COLORS = ['#22d3ee', '#fb7185', '#f59e0b', '#a78bfa', '#34d399', '#60a5fa'];

export function formatTvWait(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const hourLabel = hours === 1 ? 'hora' : 'horas';
  return remainder === 0 ? `${hours} ${hourLabel}` : `${hours} ${hourLabel} y ${remainder} min`;
}

export function formatTvApproxTime(timestampMs: number): string {
  const formatter = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(new Date(timestampMs));
}

export function formatTvClock(nowMs: number): string {
  const formatter = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return formatter.format(new Date(nowMs));
}

export function formatElapsedSinceOpening(openingHours: OpeningHoursDay[], nowMs: number): string {
  const openingStartMs = todayOpeningStartMs(openingHours, nowMs);
  if (openingStartMs === null || nowMs <= openingStartMs) {
    return '00:00:00';
  }

  const diffSeconds = Math.floor((nowMs - openingStartMs) / 1000);
  const hours = Math.floor(diffSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((diffSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(diffSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function barberAccentColor(barberId: string): string {
  let hash = 0;
  for (let i = 0; i < barberId.length; i += 1) {
    hash = (hash << 5) - hash + barberId.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % TV_BARBER_COLORS.length;
  return TV_BARBER_COLORS[index];
}

export function capitalizeDisplayName(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function todayOpeningStartMs(openingHours: OpeningHoursDay[], nowMs: number): number | null {
  if (!openingHours.length) {
    return null;
  }

  const weekday = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    weekday: 'short'
  }).format(new Date(nowMs));

  const dayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6
  };

  const dayIndex = dayMap[weekday] ?? 0;
  const day = openingHours[dayIndex];
  if (!day || day.closed || day.slots.length === 0) {
    return null;
  }

  const firstSlot = day.slots[0];
  const [hours, minutes] = firstSlot.opens.split(':').map(Number);
  const now = new Date(nowMs);

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0
  ).getTime();
}
