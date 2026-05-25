import { barberInitials, barberStatusLabel } from './barber-display.util';

describe('barberInitials', () => {
  it('returns initials from two-word name', () => {
    expect(barberInitials('Juan Pérez')).toBe('JP');
  });

  it('returns single initial for one-word name', () => {
    expect(barberInitials('Maria')).toBe('M');
  });

  it('uses only first two words for multi-word names', () => {
    expect(barberInitials('Carlos Miguel García López')).toBe('CM');
  });

  it('returns empty string for empty input', () => {
    expect(barberInitials('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(barberInitials('   ')).toBe('');
  });

  it('returns single initial for single character name', () => {
    expect(barberInitials('A')).toBe('A');
  });

  it('uppercases initials', () => {
    expect(barberInitials('ana roca')).toBe('AR');
  });
});

describe('barberStatusLabel', () => {
  it('returns "Disponible" for available status', () => {
    expect(barberStatusLabel('available')).toBe('Disponible');
  });

  it('returns "Descanso" for break status', () => {
    expect(barberStatusLabel('break')).toBe('Descanso');
  });

  it('returns "Oculto" for hidden status', () => {
    expect(barberStatusLabel('hidden')).toBe('Oculto');
  });
});
