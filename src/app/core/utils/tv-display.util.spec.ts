import { OpeningHoursDay } from '../models/shop.model';
import {
  barberAccentColor,
  capitalizeDisplayName,
  formatElapsedSinceOpening,
  formatTvApproxTime,
  formatTvClock,
  formatTvWait
} from './tv-display.util';

describe('formatTvWait', () => {
  it('formats minutes below one hour', () => {
    expect(formatTvWait(30)).toBe('30 min');
    expect(formatTvWait(0)).toBe('0 min');
    expect(formatTvWait(59)).toBe('59 min');
  });

  it('formats exactly one hour', () => {
    expect(formatTvWait(60)).toBe('1 hora');
  });

  it('formats multiple full hours', () => {
    expect(formatTvWait(120)).toBe('2 horas');
  });

  it('formats hours and remaining minutes', () => {
    expect(formatTvWait(90)).toBe('1 hora y 30 min');
    expect(formatTvWait(125)).toBe('2 horas y 5 min');
  });
});

describe('formatTvApproxTime', () => {
  it('formats a timestamp as HH:mm', () => {
    const ts = new Date('2026-05-25T14:30:00').getTime();
    const result = formatTvApproxTime(ts);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('includes hours and minutes in the output', () => {
    const ts = new Date('2026-05-25T09:05:00').getTime();
    const result = formatTvApproxTime(ts);
    expect(result).toContain(':');
    expect(result.split(':').length).toBe(2);
  });
});

describe('formatTvClock', () => {
  it('formats a timestamp as HH:mm:ss', () => {
    const ts = new Date('2026-05-25T10:15:30').getTime();
    const result = formatTvClock(ts);
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('includes seconds in the output', () => {
    const ts = new Date('2026-05-25T10:15:30').getTime();
    const result = formatTvClock(ts);
    expect(result.split(':').length).toBe(3);
  });
});

describe('formatElapsedSinceOpening', () => {
  it('returns 00:00:00 when openingHours is empty', () => {
    expect(formatElapsedSinceOpening([], Date.now())).toBe('00:00:00');
  });

  it('returns 00:00:00 when today is closed', () => {
    const hours: OpeningHoursDay[] = Array.from({ length: 7 }, () => ({
      closed: true,
      slots: []
    }));
    expect(formatElapsedSinceOpening(hours, Date.now())).toBe('00:00:00');
  });

  it('returns 00:00:00 when nowMs is before opening', () => {
    // Monday 25 May 2026 08:00 local — before 09:00 opening
    const nowMs = new Date('2026-05-25T08:00:00+02:00').getTime();
    const hours: OpeningHoursDay[] = Array.from({ length: 7 }, () => ({
      closed: false,
      slots: [{ opens: '09:00', closes: '19:00' }]
    }));
    expect(formatElapsedSinceOpening(hours, nowMs)).toBe('00:00:00');
  });

  it('returns elapsed time since opening', () => {
    // Monday 25 May 2026 09:30 Madrid time → 30 min elapsed
    const nowMs = new Date('2026-05-25T09:30:00+02:00').getTime();
    const hours: OpeningHoursDay[] = Array.from({ length: 7 }, () => ({
      closed: false,
      slots: [{ opens: '09:00', closes: '19:00' }]
    }));
    expect(formatElapsedSinceOpening(hours, nowMs)).toBe('00:30:00');
  });
});

describe('barberAccentColor', () => {
  it('returns a non-empty color string', () => {
    const color = barberAccentColor('barber1');
    expect(color).toBeTruthy();
    expect(color.startsWith('#')).toBeTrue();
  });

  it('returns the same color for the same id', () => {
    expect(barberAccentColor('barber-abc')).toBe(barberAccentColor('barber-abc'));
  });

  it('does not crash on empty string', () => {
    expect(() => barberAccentColor('')).not.toThrow();
  });
});

describe('capitalizeDisplayName', () => {
  it('capitalizes the first letter', () => {
    expect(capitalizeDisplayName('john')).toBe('John');
  });

  it('returns empty string for null', () => {
    expect(capitalizeDisplayName(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(capitalizeDisplayName(undefined)).toBe('');
  });

  it('returns empty string for whitespace-only string', () => {
    expect(capitalizeDisplayName('   ')).toBe('');
  });

  it('trims whitespace before capitalizing', () => {
    expect(capitalizeDisplayName('  alice')).toBe('Alice');
  });

  it('capitalizes single character', () => {
    expect(capitalizeDisplayName('x')).toBe('X');
  });
});
