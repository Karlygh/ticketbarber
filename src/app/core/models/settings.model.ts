export interface LastAdvanceAction {
  performedAtMs: number;
  hadCurrent: boolean;
  previousCurrentId: string | null;
  promotedId: string | null;
}

export interface BarberQueueState {
  currentTicketId: string | null;
  lastAdvance: LastAdvanceAction | null;
}

export interface QueueSettings {
  isOpen: boolean;
  updatedAtMs: number;
  activeBarberIds: string[];
  barberStates: Record<string, BarberQueueState>;
}

export const DEFAULT_QUEUE_SETTINGS: QueueSettings = {
  isOpen: true,
  updatedAtMs: 0,
  activeBarberIds: [],
  barberStates: {}
};
