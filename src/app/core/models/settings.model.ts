export interface LastAdvanceAction {
  performedAtMs: number;
  hadCurrent: boolean;
  previousCurrentId: string | null;
  promotedId: string | null;
}

export interface QueueSettings {
  isOpen: boolean;
  currentTicketId: string | null;
  updatedAtMs: number;
  lastAdvance: LastAdvanceAction | null;
}

export const DEFAULT_QUEUE_SETTINGS: QueueSettings = {
  isOpen: true,
  currentTicketId: null,
  updatedAtMs: 0,
  lastAdvance: null
};
