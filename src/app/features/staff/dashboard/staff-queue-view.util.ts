import { Ticket } from '../../../core/models/ticket.model';

export interface StaffCustomerDetail {
  name: string;
  arrivalTime: string;
  phone: string;
}

export function buildStaffCustomerDetail(
  ticket: Ticket,
  formatArrivalTime: (timestampMs: number) => string
): StaffCustomerDetail {
  return {
    name: ticket.displayName || ticket.customerName || '-',
    arrivalTime: formatArrivalTime(ticket.createdAtMs),
    phone: ticket.phone || '-'
  };
}

export function activeTicketsForBarber(tickets: Ticket[], barberId: string): Ticket[] {
  return tickets
    .filter((ticket) => ticket.barberId === barberId && ticket.status !== 'done')
    .sort((a, b) => {
      if (a.status === 'current' && b.status !== 'current') return -1;
      if (a.status !== 'current' && b.status === 'current') return 1;
      return a.position - b.position || a.createdAtMs - b.createdAtMs;
    });
}

export function doneTicketsForBarber(tickets: Ticket[], barberId: string): Ticket[] {
  return tickets
    .filter((ticket) => ticket.barberId === barberId && ticket.status === 'done')
    .sort((a, b) => {
      const aTime = a.completedAtMs ?? a.createdAtMs;
      const bTime = b.completedAtMs ?? b.createdAtMs;
      return bTime - aTime;
    });
}
