export type TicketStatus = 'waiting' | 'current' | 'done';

export interface Ticket {
  id: string;
  customerName: string;
  displayName: string;
  serviceId: string;
  serviceNameSnapshot: string;
  estimatedDurationMin: number;
  status: TicketStatus;
  position: number;
  createdAtMs: number;
  startedAtMs: number | null;
  completedAtMs: number | null;
}

export interface CreateTicketInput {
  customerName: string;
  serviceId: string;
}

export interface TicketReceipt {
  ticketId: string;
  position: number;
  estimatedWaitMin: number;
}
