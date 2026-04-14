import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { QueueRepository } from '../data/queue.repository';
import { CreateTicketInput, Ticket, TicketReceipt } from '../models/ticket.model';
import { BarberService } from '../models/service.model';
import { SettingsStore } from './settings.store';

export interface TvQueueRow {
  ticket: Ticket;
  waitMin: number;
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

  readonly canMovePrevious = computed(() => Boolean(this.settings().lastAdvance));

  async bootstrap(): Promise<void> {
    await this.settingsStore.bootstrap();
  }

  async createTicket(input: CreateTicketInput): Promise<TicketReceipt> {
    return this.repository.createTicket(input);
  }

  async moveNext(): Promise<void> {
    await this.repository.moveNext();
  }

  async movePrevious(): Promise<void> {
    await this.repository.movePrevious();
  }

  async closeDay(): Promise<void> {
    await this.settingsStore.closeDay();
  }

  async openDay(): Promise<void> {
    await this.settingsStore.openDay();
  }

  queueForTv(nowMs: number): TvQueueRow[] {
    const active = this.activeQueue();
    if (!active.length) {
      return [];
    }

    const rows: TvQueueRow[] = [];
    let carry = 0;
    active.forEach((ticket, index) => {
      if (index === 0 && ticket.status === 'current') {
        const remaining = this.remainingCurrentMinutes(ticket, nowMs);
        rows.push({ ticket, waitMin: remaining });
        carry = remaining;
        return;
      }

      rows.push({ ticket, waitMin: carry });
      carry += ticket.estimatedDurationMin;
    });

    return rows;
  }

  private remainingCurrentMinutes(ticket: Ticket, nowMs: number): number {
    if (!ticket.startedAtMs) {
      return ticket.estimatedDurationMin;
    }
    const elapsedMin = (nowMs - ticket.startedAtMs) / 60000;
    return Math.max(0, Math.ceil(ticket.estimatedDurationMin - elapsedMin));
  }
}
