import { Ticket } from '../models/ticket.model';
import { buildTvQueueRows, remainingTicketMinutes } from './tv-queue.util';

describe('tv-queue util', () => {
  const nowMs = 1_700_000_000_000;

  it('computes remaining minutes for current ticket', () => {
    const ticket = {
      id: 't1',
      barberId: 'b1',
      barberNameSnapshot: 'Leo',
      customerName: 'Ana',
      displayName: 'Ana',
      serviceId: 's1',
      serviceNameSnapshot: 'Corte',
      estimatedDurationMin: 20,
      status: 'current',
      position: 1,
      createdAtMs: nowMs - 500000,
      startedAtMs: nowMs - 5 * 60_000,
      completedAtMs: null
    } as Ticket;

    expect(remainingTicketMinutes(ticket, nowMs)).toBe(15);
  });

  it('builds queue rows with cumulative wait for upcoming tickets', () => {
    const tickets: Ticket[] = [
      {
        id: 't1', barberId: 'b1', barberNameSnapshot: 'Leo', customerName: 'Ana',
        displayName: 'Ana', serviceId: 's1', serviceNameSnapshot: 'Corte',
        estimatedDurationMin: 20, status: 'current', position: 1,
        createdAtMs: nowMs - 500000, startedAtMs: nowMs - 5 * 60_000, completedAtMs: null
      },
      {
        id: 't2', barberId: 'b1', barberNameSnapshot: 'Leo', customerName: 'Luis',
        displayName: 'Luis', serviceId: 's1', serviceNameSnapshot: 'Corte',
        estimatedDurationMin: 10, status: 'waiting', position: 2,
        createdAtMs: nowMs - 100000, startedAtMs: null, completedAtMs: null
      },
      {
        id: 't3', barberId: 'b1', barberNameSnapshot: 'Leo', customerName: 'Sara',
        displayName: 'Sara', serviceId: 's1', serviceNameSnapshot: 'Corte',
        estimatedDurationMin: 15, status: 'waiting', position: 3,
        createdAtMs: nowMs - 50000, startedAtMs: null, completedAtMs: null
      }
    ];

    const rows = buildTvQueueRows(tickets, nowMs);
    expect(rows.length).toBe(3);
    expect(rows[0].waitMin).toBe(15);
    expect(rows[1].waitMin).toBe(15);
    expect(rows[2].waitMin).toBe(25);
  });
});
