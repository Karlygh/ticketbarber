import { Ticket } from '../models/ticket.model';
import { TvQueueRow } from '../stores/queue.store';

export function remainingTicketMinutes(ticket: Ticket, nowMs: number): number {
  if (!ticket.startedAtMs) {
    return ticket.estimatedDurationMin;
  }

  const elapsedMin = (nowMs - ticket.startedAtMs) / 60000;
  return Math.max(0, Math.ceil(ticket.estimatedDurationMin - elapsedMin));
}

export function buildTvQueueRows(tickets: Ticket[], nowMs: number): TvQueueRow[] {
  if (!tickets.length) {
    return [];
  }

  const rows: TvQueueRow[] = [];
  let carry = 0;

  tickets.forEach((ticket, index) => {
    if (index === 0 && ticket.status === 'current') {
      const remaining = remainingTicketMinutes(ticket, nowMs);
      const etaAtMs = nowMs + (remaining * 60000);
      rows.push({ ticket, waitMin: remaining, etaAtMs });
      carry = remaining;
      return;
    }

    const etaAtMs = nowMs + (carry * 60000);
    rows.push({ ticket, waitMin: carry, etaAtMs });
    carry += ticket.estimatedDurationMin;
  });

  return rows;
}
