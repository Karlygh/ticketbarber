import { LegacyOpeningHoursDay, OpeningHoursDay, OpeningHoursSlot, WEEK_DAYS, defaultOpeningHours } from '../models/shop.model';

type UnknownOpeningDay = Partial<LegacyOpeningHoursDay & OpeningHoursDay> & {
  slots?: Array<Partial<OpeningHoursSlot>>;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function normalizeSlot(slot: Partial<OpeningHoursSlot> | undefined): OpeningHoursSlot | null {
  if (!slot || !isValidTime(slot.opens) || !isValidTime(slot.closes)) {
    return null;
  }
  return { opens: slot.opens, closes: slot.closes };
}

export function normalizeOpeningHoursDay(day: unknown, fallback: OpeningHoursDay): OpeningHoursDay {
  const value = (day ?? {}) as UnknownOpeningDay;
  const closed = value.closed === true;

  const normalizedSlots = Array.isArray(value.slots)
    ? value.slots
      .map((slot) => normalizeSlot(slot))
      .filter((slot): slot is OpeningHoursSlot => !!slot)
      .slice(0, 2)
    : [];

  if (normalizedSlots.length > 0) {
    return { closed, slots: normalizedSlots };
  }

  if (isValidTime(value.opens) && isValidTime(value.closes)) {
    return { closed, slots: [{ opens: value.opens, closes: value.closes }] };
  }

  return { closed: fallback.closed, slots: [...fallback.slots] };
}

export function normalizeOpeningHoursDays(input: unknown): OpeningHoursDay[] {
  const defaults = defaultOpeningHours();
  if (!Array.isArray(input) || input.length !== WEEK_DAYS.length) {
    return defaults;
  }

  return input.map((day, index) => normalizeOpeningHoursDay(day, defaults[index]));
}

export function validateOpeningHoursDay(day: OpeningHoursDay): string | null {
  if (day.closed) {
    return null;
  }
  if (!Array.isArray(day.slots) || day.slots.length < 1 || day.slots.length > 2) {
    return 'Debes indicar uno o dos tramos.';
  }

  const [first, second] = day.slots;
  if (toMinutes(first.opens) >= toMinutes(first.closes)) {
    return 'El primer tramo debe tener inicio anterior al cierre.';
  }
  if (!second) {
    return null;
  }

  if (toMinutes(second.opens) >= toMinutes(second.closes)) {
    return 'El segundo tramo debe tener inicio anterior al cierre.';
  }
  if (toMinutes(first.closes) > toMinutes(second.opens)) {
    return 'Los tramos no pueden solaparse.';
  }
  return null;
}

export function formatOpeningHoursForToday(days: OpeningHoursDay[], now: Date, timeZone = 'Europe/Madrid'): string {
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' }).format(now);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6
  };

  const dayIndex = map[weekday] ?? 0;
  const day = days[dayIndex] ?? defaultOpeningHours()[dayIndex];
  if (day.closed || day.slots.length === 0) {
    return 'Cerrado';
  }

  return day.slots.map((slot) => `${slot.opens}-${slot.closes}`).join(' · ');
}
