import { Ticket } from '../../../core/models/ticket.model';
import {
  activeTicketsForBarber,
  buildStaffCustomerDetail,
  doneTicketsForBarber
} from './staff-queue-view.util';

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-1',
    barberId: 'barber-1',
    barberNameSnapshot: 'Juan',
    customerName: 'Cliente',
    displayName: '',
    serviceId: 'svc-1',
    serviceNameSnapshot: 'Corte',
    estimatedDurationMin: 30,
    status: 'waiting',
    position: 1,
    createdAtMs: 1000,
    startedAtMs: null,
    completedAtMs: null,
    ...overrides
  };
}

describe('buildStaffCustomerDetail', () => {
  const format = (ms: number) => `time:${ms}`;

  it('uses displayName when present', () => {
    const ticket = makeTicket({ displayName: 'John', customerName: 'john' });
    expect(buildStaffCustomerDetail(ticket, format).name).toBe('John');
  });

  it('falls back to customerName when displayName is empty', () => {
    const ticket = makeTicket({ displayName: '', customerName: 'john' });
    expect(buildStaffCustomerDetail(ticket, format).name).toBe('john');
  });

  it('falls back to "-" when both names are empty', () => {
    const ticket = makeTicket({ displayName: '', customerName: '' });
    expect(buildStaffCustomerDetail(ticket, format).name).toBe('-');
  });

  it('calls formatArrivalTime with createdAtMs', () => {
    const ticket = makeTicket({ createdAtMs: 9999 });
    expect(buildStaffCustomerDetail(ticket, format).arrivalTime).toBe('time:9999');
  });

  it('uses phone when present', () => {
    const ticket = makeTicket({ phone: '600123456' });
    expect(buildStaffCustomerDetail(ticket, format).phone).toBe('600123456');
  });

  it('falls back to "-" when phone is missing', () => {
    const ticket = makeTicket({ phone: undefined });
    expect(buildStaffCustomerDetail(ticket, format).phone).toBe('-');
  });
});

describe('activeTicketsForBarber', () => {
  it('returns empty array when no tickets match barberId', () => {
    const tickets = [makeTicket({ barberId: 'other' })];
    expect(activeTicketsForBarber(tickets, 'barber-1')).toEqual([]);
  });

  it('excludes done tickets', () => {
    const tickets = [makeTicket({ status: 'done' })];
    expect(activeTicketsForBarber(tickets, 'barber-1')).toEqual([]);
  });

  it('puts current ticket first', () => {
    const tickets = [
      makeTicket({ id: 'w1', status: 'waiting', position: 1 }),
      makeTicket({ id: 'c1', status: 'current', position: 0 })
    ];
    const result = activeTicketsForBarber(tickets, 'barber-1');
    expect(result[0].id).toBe('c1');
  });

  it('sorts waiting tickets by position then createdAtMs', () => {
    const tickets = [
      makeTicket({ id: 'w2', status: 'waiting', position: 2, createdAtMs: 1000 }),
      makeTicket({ id: 'w1', status: 'waiting', position: 1, createdAtMs: 2000 })
    ];
    const result = activeTicketsForBarber(tickets, 'barber-1');
    expect(result[0].id).toBe('w1');
    expect(result[1].id).toBe('w2');
  });
});

describe('doneTicketsForBarber', () => {
  it('returns only done tickets for the barber', () => {
    const tickets = [
      makeTicket({ id: 'd1', status: 'done' }),
      makeTicket({ id: 'w1', status: 'waiting' }),
      makeTicket({ id: 'd2', status: 'done', barberId: 'other' })
    ];
    const result = doneTicketsForBarber(tickets, 'barber-1');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('d1');
  });

  it('sorts done tickets by completedAtMs descending', () => {
    const tickets = [
      makeTicket({ id: 'd1', status: 'done', completedAtMs: 1000 }),
      makeTicket({ id: 'd2', status: 'done', completedAtMs: 2000 })
    ];
    const result = doneTicketsForBarber(tickets, 'barber-1');
    expect(result[0].id).toBe('d2');
    expect(result[1].id).toBe('d1');
  });

  it('falls back to createdAtMs when completedAtMs is null', () => {
    const tickets = [
      makeTicket({ id: 'd1', status: 'done', completedAtMs: null, createdAtMs: 500 }),
      makeTicket({ id: 'd2', status: 'done', completedAtMs: null, createdAtMs: 1500 })
    ];
    const result = doneTicketsForBarber(tickets, 'barber-1');
    expect(result[0].id).toBe('d2');
  });
});
