import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { QueueRepository } from '../data/queue.repository';
import { CreateTicketInput, Ticket, TicketReceipt } from '../models/ticket.model';
import { BarberService } from '../models/service.model';
import { buildTvQueueRows } from '../utils/tv-queue.util';
import { SettingsStore } from './settings.store';

export interface TvQueueRow {
  ticket: Ticket;
  waitMin: number;
  etaAtMs: number;
}

@Injectable({ providedIn: 'root' })
export class QueueStore {
  private readonly repository = inject(QueueRepository);
  private readonly settingsStore = inject(SettingsStore);

  readonly tickets = toSignal(this.repository.observeTickets(), { initialValue: [] as Ticket[] });
  readonly services = toSignal(this.repository.observeServices(), { initialValue: [] as BarberService[] });
  readonly settings = computed(() => this.settingsStore.settings());

  readonly activeQueue = computed(() =>
    this.tickets()
      .filter((ticket) => ticket.status !== 'done')
      .sort((a, b) => a.position - b.position || a.createdAtMs - b.createdAtMs)
  );

  readonly currentTicket = computed(() => {
    const active = this.activeQueue();
    return active.find((ticket) => ticket.status === 'current') ?? null;
  });

  readonly waitingTickets = computed(() =>
    this.activeQueue().filter((ticket) => ticket.status === 'waiting').sort((a, b) => a.position - b.position)
  );

  readonly activeBarberIds = computed(() => this.settings().activeBarberIds);

  async bootstrap(): Promise<void> {
    await this.settingsStore.bootstrap();
  }

  async createTicket(input: CreateTicketInput): Promise<TicketReceipt> {
    return this.repository.createTicket(input);
  }

  async moveNext(barberId: string): Promise<void> {
    await this.repository.moveNext(barberId);
  }

  async movePrevious(barberId: string): Promise<void> {
    await this.repository.movePrevious(barberId);
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await this.repository.deleteTicket(ticketId);
  }

  async closeDay(): Promise<void> {
    await this.settingsStore.closeDay();
  }

  async openDay(activeBarberIds: string[]): Promise<void> {
    await this.settingsStore.openDay(activeBarberIds);
  }

  async cancelTicketsForBarber(barberId: string): Promise<void> {
    await this.repository.cancelTicketsForBarber(barberId);
  }

  ticketsForBarber(barberId: string): Ticket[] {
    return this.activeQueue().filter((ticket) => ticket.barberId === barberId);
  }

  currentTicketForBarber(barberId: string): Ticket | null {
    return this.ticketsForBarber(barberId).find((ticket) => ticket.status === 'current') ?? null;
  }

  waitingTicketsForBarber(barberId: string): Ticket[] {
    return this.ticketsForBarber(barberId).filter((ticket) => ticket.status === 'waiting');
  }

  canMovePreviousForBarber(barberId: string): boolean {
    return Boolean(this.settings().barberStates[barberId]?.lastAdvance);
  }

  queueForTv(nowMs: number): TvQueueRow[] {
    return buildTvQueueRows(this.activeQueue(), nowMs);
  }
}
