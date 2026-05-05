export type TicketStatus = 'waiting' | 'current' | 'done';

export interface Ticket {
  id: string;
  barberId: string;
  barberNameSnapshot: string;
  barberPhotoUrlSnapshot?: string;
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
  phone?: string;
}

export interface CreateTicketInput {
  barberId: string;
  customerName: string;
  serviceId: string;
  phone?: string;
}

export interface TicketReceipt {
  ticketId: string;
  position: number;
  estimatedWaitMin: number;
}
