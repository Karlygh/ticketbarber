import { WEEK_DAYS, defaultOpeningHours } from './shop.model';

describe('WEEK_DAYS', () => {
  it('has 7 elements', () => {
    expect(WEEK_DAYS.length).toBe(7);
  });

  it('starts on Monday and ends on Sunday', () => {
    expect(WEEK_DAYS[0]).toBe('Lunes');
    expect(WEEK_DAYS[6]).toBe('Domingo');
  });

  it('contains all days in correct order', () => {
    expect(WEEK_DAYS).toEqual([
      'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
    ]);
  });
});

describe('defaultOpeningHours', () => {
  it('returns 7 days', () => {
    expect(defaultOpeningHours().length).toBe(7);
  });

  it('marks Sunday (index 6) as closed', () => {
    const hours = defaultOpeningHours();
    expect(hours[6].closed).toBeTrue();
  });

  it('marks Monday to Saturday as open', () => {
    const hours = defaultOpeningHours();
    for (let i = 0; i < 6; i++) {
      expect(hours[i].closed).toBeFalse();
    }
  });

  it('sets default slot to 09:00 - 19:00 for open days', () => {
    const hours = defaultOpeningHours();
    for (let i = 0; i < 6; i++) {
      expect(hours[i].slots.length).toBe(1);
      expect(hours[i].slots[0]).toEqual({ opens: '09:00', closes: '19:00' });
    }
  });

  it('returns a new array on each call (no shared reference)', () => {
    const a = defaultOpeningHours();
    const b = defaultOpeningHours();
    expect(a).not.toBe(b);
  });
});
