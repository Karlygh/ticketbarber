import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  getDoc,
  getDocs,
  query,
  setDoc,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BarberProfile } from '../models/barber.model';
import {
  BarberQueueState,
  DEFAULT_QUEUE_SETTINGS,
  LastAdvanceAction,
  QueueSettings
} from '../models/settings.model';
import { DEFAULT_SERVICES, BarberService } from '../models/service.model';
import { CreateTicketInput, Ticket, TicketReceipt } from '../models/ticket.model';
import { AuthStore } from '../stores/auth.store';

type TicketRecord = Omit<Ticket, 'id'>;

@Injectable({ providedIn: 'root' })
export class QueueRepository {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);
  private readonly authStore = inject(AuthStore);

  private get shopId(): string {
    const uid = this.authStore.user()?.uid;
    if (!uid) throw new Error('No hay sesion activa');
    return uid;
  }

  private settingsDocPath(): string {
    return `shops/${this.shopId}/settings/queue`;
  }

  private servicesColPath(): string {
    return `shops/${this.shopId}/services`;
  }

  private ticketsColPath(): string {
    return `shops/${this.shopId}/tickets`;
  }

  private barbersColPath(): string {
    return `shops/${this.shopId}/barbers`;
  }

  private servicesCollectionRef() {
    return this.runInInjectionContext(() => collection(this.firestore, this.servicesColPath()));
  }

  private ticketsCollectionRef() {
    return this.runInInjectionContext(() => collection(this.firestore, this.ticketsColPath()));
  }

  private settingsDocRef() {
    return this.runInInjectionContext(() => doc(this.firestore, this.settingsDocPath()));
  }

  observeServices(): Observable<BarberService[]> {
    return this.runInInjectionContext(() => collectionData(this.servicesCollectionRef(), { idField: 'id' })).pipe(
      map((rows) =>
        rows
          .map((row) => {
            const service = row as BarberService;
            return {
              ...service,
              durationMin: Number(service.durationMin ?? 0),
              active: Boolean(service.active)
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name))
      ),
      catchError(() => of([]))
    );
  }

  observeTickets(): Observable<Ticket[]> {
    return this.observeTicketsForShop(this.shopId);
  }

  observeSettings(): Observable<QueueSettings> {
    return this.observeSettingsForShop(this.shopId);
  }

  async bootstrapDefaults(): Promise<void> {
    const settingsRef = this.settingsDocRef();
    const servicesRef = this.servicesCollectionRef();
    const servicesSnap = await this.runInInjectionContext(() => getDocs(query(servicesRef)));

    if (servicesSnap.empty) {
      const batch = this.runInInjectionContext(() => writeBatch(this.firestore));
      for (const service of DEFAULT_SERVICES) {
        const ref = this.runInInjectionContext(() => doc(servicesRef));
        batch.set(ref, service);
      }
      await batch.commit();
    }

    await this.runInInjectionContext(() =>
      setDoc(
        settingsRef,
        {
          ...DEFAULT_QUEUE_SETTINGS,
          updatedAtMs: Date.now()
        },
        { merge: true }
      )
    );
  }

  async createTicket(input: CreateTicketInput): Promise<TicketReceipt> {
    const nowMs = Date.now();
    const settings = await this.getSettings();
    if (!settings.isOpen) {
      throw new Error('La jornada esta cerrada');
    }
    if (!settings.activeBarberIds.includes(input.barberId)) {
      throw new Error('Ese barbero no esta disponible en este momento');
    }

    const serviceRef = this.runInInjectionContext(() => doc(this.firestore, `${this.servicesColPath()}/${input.serviceId}`));
    const serviceSnap = await this.runInInjectionContext(() => getDoc(serviceRef));
    if (!serviceSnap.exists()) {
      throw new Error('Servicio no valido');
    }
    const service = serviceSnap.data() as BarberService;

    const barberRef = this.runInInjectionContext(() => doc(this.firestore, `${this.barbersColPath()}/${input.barberId}`));
    const barberSnap = await this.runInInjectionContext(() => getDoc(barberRef));
    if (!barberSnap.exists()) {
      throw new Error('Barbero no valido');
    }
    const barber = barberSnap.data() as BarberProfile;

    const tickets = await this.fetchTickets();
    const active = this.activeQueueForBarber(tickets, input.barberId);
    const hasCurrent = active.some((ticket) => ticket.status === 'current');
    const estimatedWaitMin = this.estimateWaitForNewTicket(active, nowMs);
    const position = active.length + 1;
    const newTicketRef = this.runInInjectionContext(() => doc(this.ticketsCollectionRef()));

    const payload: TicketRecord = {
      barberId: input.barberId,
      barberNameSnapshot: barber.name,
      customerName: input.customerName.trim(),
      displayName: input.customerName.trim(),
      serviceId: input.serviceId,
      serviceNameSnapshot: service.name,
      estimatedDurationMin: Number(service.durationMin ?? 0),
      status: hasCurrent ? 'waiting' : 'current',
      position,
      createdAtMs: nowMs,
      startedAtMs: hasCurrent ? null : nowMs,
      completedAtMs: null,
      ...(barber.photoUrl ? { barberPhotoUrlSnapshot: barber.photoUrl } : {}),
      ...(input.phone ? { phone: input.phone } : {})
    };

    const nextState = this.ensureBarberState(settings, input.barberId);
    const batch = this.runInInjectionContext(() => writeBatch(this.firestore));
    batch.set(newTicketRef, payload);
    batch.set(
      this.settingsDocRef(),
      {
        barberStates: {
          ...settings.barberStates,
          [input.barberId]: {
            currentTicketId: hasCurrent ? nextState.currentTicketId : newTicketRef.id,
            lastAdvance: null
          }
        },
        updatedAtMs: nowMs
      },
      { merge: true }
    );
    await batch.commit();

    return {
      ticketId: newTicketRef.id,
      position,
      estimatedWaitMin
    };
  }

  async moveNext(barberId: string): Promise<void> {
    const nowMs = Date.now();
    const settings = await this.getSettings();
    const tickets = await this.fetchTickets();
    const active = this.activeQueueForBarber(tickets, barberId);
    if (!active.length) return;

    const current = active.find((ticket) => ticket.status === 'current') ?? null;
    const waiting = active.filter((ticket) => ticket.status === 'waiting').sort((a, b) => a.position - b.position);
    const promoted = waiting[0] ?? null;
    const hadCurrent = Boolean(current);

    const batch = this.runInInjectionContext(() => writeBatch(this.firestore));

    if (current) {
      batch.update(this.runInInjectionContext(() => doc(this.firestore, `${this.ticketsColPath()}/${current.id}`)), {
        status: 'done',
        position: -1,
        completedAtMs: nowMs
      });
    }

    if (promoted) {
      batch.update(this.runInInjectionContext(() => doc(this.firestore, `${this.ticketsColPath()}/${promoted.id}`)), {
        status: 'current',
        position: 1,
        startedAtMs: promoted.startedAtMs ?? nowMs,
        completedAtMs: null
      });
    }

    const restWaiting = waiting.filter((ticket) => ticket.id !== promoted?.id);
    restWaiting.forEach((ticket, index) => {
      batch.update(this.runInInjectionContext(() => doc(this.firestore, `${this.ticketsColPath()}/${ticket.id}`)), {
        position: index + 2
      });
    });

    const lastAdvance: LastAdvanceAction = {
      performedAtMs: nowMs,
      hadCurrent,
      previousCurrentId: current?.id ?? null,
      promotedId: promoted?.id ?? null
    };

    batch.set(
      this.settingsDocRef(),
      {
        barberStates: {
          ...settings.barberStates,
          [barberId]: {
            currentTicketId: promoted?.id ?? null,
            lastAdvance
          }
        },
        updatedAtMs: nowMs
      },
      { merge: true }
    );

    await batch.commit();
  }

  async movePrevious(barberId: string): Promise<void> {
    const nowMs = Date.now();
    const settings = await this.getSettings();
    const last = this.ensureBarberState(settings, barberId).lastAdvance;
    if (!last) return;

    const ticketMap = new Map<string, Ticket>();
    const tickets = await this.fetchTickets();
    tickets.forEach((ticket) => {
      if (ticket.barberId === barberId) {
        ticketMap.set(ticket.id, ticket);
      }
    });

    const promoted = last.promotedId ? ticketMap.get(last.promotedId) ?? null : null;
    const previousCurrent = last.previousCurrentId ? ticketMap.get(last.previousCurrentId) ?? null : null;
    const waiting = Array.from(ticketMap.values())
      .filter((ticket) => ticket.status === 'waiting' && ticket.id !== promoted?.id)
      .sort((a, b) => a.position - b.position);

    let currentTicketId: string | null = null;
    const batch = this.runInInjectionContext(() => writeBatch(this.firestore));

    if (last.hadCurrent && previousCurrent) {
      batch.update(this.runInInjectionContext(() => doc(this.firestore, `${this.ticketsColPath()}/${previousCurrent.id}`)), {
        status: 'current',
        position: 1,
        completedAtMs: null
      });
      currentTicketId = previousCurrent.id;
    }

    let nextWaitingPosition = currentTicketId ? 2 : 1;
    if (promoted) {
      batch.update(this.runInInjectionContext(() => doc(this.firestore, `${this.ticketsColPath()}/${promoted.id}`)), {
        status: 'waiting',
        position: nextWaitingPosition,
        startedAtMs: null
      });
      nextWaitingPosition += 1;
    }

    waiting.forEach((ticket, index) => {
      batch.update(this.runInInjectionContext(() => doc(this.firestore, `${this.ticketsColPath()}/${ticket.id}`)), {
        position: nextWaitingPosition + index
      });
    });

    batch.set(
      this.settingsDocRef(),
      {
        barberStates: {
          ...settings.barberStates,
          [barberId]: {
            currentTicketId,
            lastAdvance: null
          }
        },
        updatedAtMs: nowMs
      },
      { merge: true }
    );

    await batch.commit();
  }

  async deleteTicket(ticketId: string): Promise<void> {
    const nowMs = Date.now();
    const settings = await this.getSettings();
    const tickets = await this.fetchTickets();
    const ticketToDelete = tickets.find((ticket) => ticket.id === ticketId);
    if (!ticketToDelete) return;

    const barberId = ticketToDelete.barberId;
    const batch = this.runInInjectionContext(() => writeBatch(this.firestore));
    batch.delete(this.runInInjectionContext(() => doc(this.firestore, `${this.ticketsColPath()}/${ticketId}`)));

    const remainingActive = this.activeQueueForBarber(tickets.filter((ticket) => ticket.id !== ticketId), barberId);
    let currentTicket = remainingActive.find((ticket) => ticket.status === 'current') ?? null;

    if (!currentTicket) {
      const promoted = remainingActive.find((ticket) => ticket.status === 'waiting') ?? null;
      if (promoted) {
        currentTicket = {
          ...promoted,
          status: 'current',
          position: 1,
          startedAtMs: promoted.startedAtMs ?? nowMs,
          completedAtMs: null
        };
        batch.update(this.runInInjectionContext(() => doc(this.firestore, `${this.ticketsColPath()}/${promoted.id}`)), {
          status: 'current',
          position: 1,
          startedAtMs: promoted.startedAtMs ?? nowMs,
          completedAtMs: null
        });
      }
    }

    const waiting = remainingActive.filter((ticket) => ticket.id !== currentTicket?.id);
    const waitingStartPosition = currentTicket ? 2 : 1;
    waiting.forEach((ticket, index) => {
      batch.update(this.runInInjectionContext(() => doc(this.firestore, `${this.ticketsColPath()}/${ticket.id}`)), {
        status: 'waiting',
        position: waitingStartPosition + index,
        completedAtMs: null
      });
    });

    batch.set(
      this.settingsDocRef(),
      {
        barberStates: {
          ...settings.barberStates,
          [barberId]: {
            currentTicketId: currentTicket?.id ?? null,
            lastAdvance: null
          }
        },
        updatedAtMs: nowMs
      },
      { merge: true }
    );

    await batch.commit();
  }

  async closeDay(): Promise<void> {
    const batch = this.runInInjectionContext(() => writeBatch(this.firestore));
    const ticketsSnap = await this.runInInjectionContext(() => getDocs(query(this.ticketsCollectionRef())));
    ticketsSnap.forEach((ticket) => batch.delete(ticket.ref));
    batch.set(
      this.settingsDocRef(),
      {
        isOpen: false,
        activeBarberIds: [],
        barberStates: {},
        updatedAtMs: Date.now()
      },
      { merge: true }
    );
    await batch.commit();
  }

  async openDay(activeBarberIds: string[]): Promise<void> {
    const barberStates = activeBarberIds.reduce<Record<string, BarberQueueState>>((acc, barberId) => {
      acc[barberId] = { currentTicketId: null, lastAdvance: null };
      return acc;
    }, {});
    await this.runInInjectionContext(() =>
      setDoc(
        this.settingsDocRef(),
        {
          isOpen: true,
          activeBarberIds,
          barberStates,
          updatedAtMs: Date.now()
        },
        { merge: true }
      )
    );
  }

  async cancelTicketsForBarber(barberId: string): Promise<void> {
    const tickets = await this.fetchTickets();
    const pending = tickets.filter((ticket) => ticket.barberId === barberId && ticket.status !== 'done');
    for (const ticket of pending) {
      await this.deleteTicket(ticket.id);
    }
  }

  observeTicketsForShop(shopId: string): Observable<Ticket[]> {
    const ref = this.runInInjectionContext(() => collection(this.firestore, `shops/${shopId}/tickets`));
    return this.runInInjectionContext(() => collectionData(query(ref), { idField: 'id' })).pipe(
      map((rows) =>
        rows
          .map((row) => this.toTicket(row as Ticket))
          .sort((a, b) => {
            if (a.status === 'done' && b.status !== 'done') return 1;
            if (a.status !== 'done' && b.status === 'done') return -1;
            if (a.barberId !== b.barberId) return a.barberNameSnapshot.localeCompare(b.barberNameSnapshot);
            return a.position - b.position || a.createdAtMs - b.createdAtMs;
          })
      ),
      catchError(() => of([]))
    );
  }

  observeSettingsForShop(shopId: string): Observable<QueueSettings> {
    const ref = this.runInInjectionContext(() => doc(this.firestore, `shops/${shopId}/settings/queue`));
    return this.runInInjectionContext(() => docData(ref, { idField: 'id' })).pipe(
      map((row) => this.toSettings(row as Partial<QueueSettings> | undefined)),
      catchError(() => of(DEFAULT_QUEUE_SETTINGS))
    );
  }

  async updateTvViewForShop(shopId: string, tvView: QueueSettings['tvView']): Promise<void> {
    const ref = this.runInInjectionContext(() => doc(this.firestore, `shops/${shopId}/settings/queue`));
    await this.runInInjectionContext(() =>
      setDoc(
        ref,
        {
          tvView,
          updatedAtMs: Date.now()
        },
        { merge: true }
      )
    );
  }

  private async fetchTickets(): Promise<Ticket[]> {
    const ticketsSnap = await this.runInInjectionContext(() => getDocs(query(this.ticketsCollectionRef())));
    return ticketsSnap.docs.map((ticketDoc) => this.toTicket({ id: ticketDoc.id, ...ticketDoc.data() } as Ticket));
  }

  private async getSettings(): Promise<QueueSettings> {
    const settingsSnap = await this.runInInjectionContext(() => getDoc(this.settingsDocRef()));
    return this.toSettings(settingsSnap.data() as Partial<QueueSettings> | undefined);
  }

  private runInInjectionContext<T>(callback: () => T): T {
    return runInInjectionContext(this.injector, callback);
  }

  private toSettings(value: Partial<QueueSettings> | undefined): QueueSettings {
    if (!value) {
      return DEFAULT_QUEUE_SETTINGS;
    }
    return {
      isOpen: value.isOpen ?? true,
      updatedAtMs: value.updatedAtMs ?? 0,
      activeBarberIds: Array.isArray(value.activeBarberIds) ? value.activeBarberIds : [],
      barberStates: value.barberStates ?? {},
      tvView: value.tvView ?? DEFAULT_QUEUE_SETTINGS.tvView
    };
  }

  private toTicket(value: Ticket): Ticket {
    return {
      id: value.id,
      barberId: value.barberId,
      barberNameSnapshot: value.barberNameSnapshot ?? '',
      barberPhotoUrlSnapshot: value.barberPhotoUrlSnapshot ?? undefined,
      customerName: value.customerName,
      displayName: value.displayName ?? value.customerName,
      serviceId: value.serviceId,
      serviceNameSnapshot: value.serviceNameSnapshot,
      estimatedDurationMin: Number(value.estimatedDurationMin ?? 0),
      status: value.status,
      position: Number(value.position ?? 0),
      createdAtMs: Number(value.createdAtMs ?? 0),
      startedAtMs: value.startedAtMs ?? null,
      completedAtMs: value.completedAtMs ?? null,
      phone: value.phone ?? undefined
    };
  }

  private activeQueueForBarber(tickets: Ticket[], barberId: string): Ticket[] {
    return tickets
      .filter((ticket) => ticket.barberId === barberId && ticket.status !== 'done')
      .sort((a, b) => a.position - b.position || a.createdAtMs - b.createdAtMs);
  }

  private ensureBarberState(settings: QueueSettings, barberId: string): BarberQueueState {
    return settings.barberStates[barberId] ?? {
      currentTicketId: null,
      lastAdvance: null
    };
  }

  private estimateWaitForNewTicket(active: Ticket[], nowMs: number): number {
    if (!active.length) {
      return 0;
    }
    const [first, ...rest] = active;
    const firstBlock =
      first.status === 'current' ? this.currentRemainingMinutes(first, nowMs) : first.estimatedDurationMin;
    const restBlock = rest.reduce((sum, ticket) => sum + ticket.estimatedDurationMin, 0);
    return Math.max(0, Math.round(firstBlock + restBlock));
  }

  private currentRemainingMinutes(ticket: Ticket, nowMs: number): number {
    if (!ticket.startedAtMs) {
      return ticket.estimatedDurationMin;
    }
    const elapsedMinutes = (nowMs - ticket.startedAtMs) / 60000;
    return Math.max(0, Math.ceil(ticket.estimatedDurationMin - elapsedMinutes));
  }
}
