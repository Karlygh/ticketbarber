import { formatOpeningHoursForToday, normalizeOpeningHoursDays, validateOpeningHoursDay } from './opening-hours.util';

describe('opening-hours util', () => {
  it('normalizes legacy day format into slots', () => {
    const legacy = [
      { opens: '09:00', closes: '13:30', closed: false },
      { opens: '09:00', closes: '19:00', closed: false },
      { opens: '09:00', closes: '19:00', closed: false },
      { opens: '09:00', closes: '19:00', closed: false },
      { opens: '09:00', closes: '19:00', closed: false },
      { opens: '10:00', closes: '14:00', closed: false },
      { opens: '09:00', closes: '19:00', closed: true }
    ];

    const normalized = normalizeOpeningHoursDays(legacy);
    expect(normalized[0].slots.length).toBe(1);
    expect(normalized[0].slots[0]).toEqual({ opens: '09:00', closes: '13:30' });
  });

  it('keeps modern format with split shifts', () => {
    const modern = Array.from({ length: 7 }).map((_, i) => ({
      closed: i === 6,
      slots: i === 0
        ? [{ opens: '09:00', closes: '13:30' }, { opens: '16:00', closes: '20:00' }]
        : [{ opens: '09:00', closes: '19:00' }]
    }));

    const normalized = normalizeOpeningHoursDays(modern);
    expect(normalized[0].slots.length).toBe(2);
    expect(normalized[0].slots[1]).toEqual({ opens: '16:00', closes: '20:00' });
  });

  it('rejects overlapping split slots', () => {
    const error = validateOpeningHoursDay({
      closed: false,
      slots: [{ opens: '09:00', closes: '14:00' }, { opens: '13:00', closes: '18:00' }]
    });
    expect(error).toContain('solap');
  });

  it('accepts touching split slots', () => {
    const error = validateOpeningHoursDay({
      closed: false,
      slots: [{ opens: '09:00', closes: '13:30' }, { opens: '13:30', closes: '18:00' }]
    });
    expect(error).toBeNull();
  });

  it('formats today hours in Madrid timezone', () => {
    const days = Array.from({ length: 7 }).map(() => ({
      closed: false,
      slots: [{ opens: '09:00', closes: '19:00' }]
    }));
    days[1] = {
      closed: false,
      slots: [{ opens: '09:00', closes: '13:30' }, { opens: '16:00', closes: '20:00' }]
    };

    const text = formatOpeningHoursForToday(days, new Date('2026-05-05T10:00:00Z'), 'Europe/Madrid');
    expect(text).toBe('09:00-13:30 · 16:00-20:00');
  });
});
