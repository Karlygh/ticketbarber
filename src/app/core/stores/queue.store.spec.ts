import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { QueueRepository } from '../data/queue.repository';
import { QueueSettings } from '../models/settings.model';
import { BarberService } from '../models/service.model';
import { Ticket } from '../models/ticket.model';
import { SettingsStore } from './settings.store';
import { QueueStore } from './queue.store';

describe('QueueStore', () => {
  let store: QueueStore;

  const tickets$ = new BehaviorSubject<Ticket[]>([]);
  const services$ = new BehaviorSubject<BarberService[]>([]);
  const settingsState = {
    value: {
      isOpen: true,
      updatedAtMs: 0,
      activeBarberIds: ['b1'],
      barberStates: { b1: { currentTicketId: 't1', lastAdvance: null } },
      tvView: 'cards-light'
    } as QueueSettings
  };

  const repositoryMock = {
    observeTickets: jasmine.createSpy('observeTickets').and.returnValue(tickets$.asObservable()),
    observeServices: jasmine.createSpy('observeServices').and.returnValue(services$.asObservable()),
    createTicket: jasmine.createSpy('createTicket').and.resolveTo({ ticketId: 't4', position: 3, estimatedWaitMin: 20 }),
    moveNext: jasmine.createSpy('moveNext').and.resolveTo(),
    movePrevious: jasmine.createSpy('movePrevious').and.resolveTo(),
    deleteTicket: jasmine.createSpy('deleteTicket').and.resolveTo(),
    cancelTicketsForBarber: jasmine.createSpy('cancelTicketsForBarber').and.resolveTo()
  };

  const settingsStoreMock = {
    settings: jasmine.createSpy('settings').and.callFake(() => settingsState.value),
    bootstrap: jasmine.createSpy('bootstrap').and.resolveTo(),
    closeDay: jasmine.createSpy('closeDay').and.resolveTo(),
    openDay: jasmine.createSpy('openDay').and.resolveTo()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        QueueStore,
        { provide: QueueRepository, useValue: repositoryMock },
        { provide: SettingsStore, useValue: settingsStoreMock }
      ]
    });
    store = TestBed.inject(QueueStore);
    repositoryMock.createTicket.calls.reset();
    repositoryMock.moveNext.calls.reset();
    repositoryMock.deleteTicket.calls.reset();
  });

  it('computes active, current and waiting queue consistently', () => {
    const now = Date.now();
    tickets$.next([
      {
        id: 't2', barberId: 'b1', barberNameSnapshot: 'Leo', customerName: 'B',
        displayName: 'B', serviceId: 's1', serviceNameSnapshot: 'Corte',
        estimatedDurationMin: 15, status: 'waiting', position: 2, createdAtMs: now + 1000,
        startedAtMs: null, completedAtMs: null
      },
      {
        id: 't1', barberId: 'b1', barberNameSnapshot: 'Leo', customerName: 'A',
        displayName: 'A', serviceId: 's1', serviceNameSnapshot: 'Corte',
        estimatedDurationMin: 20, status: 'current', position: 1, createdAtMs: now,
        startedAtMs: now - 300000, completedAtMs: null
      },
      {
        id: 't3', barberId: 'b1', barberNameSnapshot: 'Leo', customerName: 'C',
        displayName: 'C', serviceId: 's1', serviceNameSnapshot: 'Corte',
        estimatedDurationMin: 10, status: 'done', position: 3, createdAtMs: now + 2000,
        startedAtMs: null, completedAtMs: now + 600000
      }
    ]);

    expect(store.activeQueue().map((t) => t.id)).toEqual(['t1', 't2']);
    expect(store.currentTicket()?.id).toBe('t1');
    expect(store.waitingTickets().map((t) => t.id)).toEqual(['t2']);
    expect(store.waitingTicketsForBarber('b1').length).toBe(1);
  });

  it('delegates write operations to repository/settings store', async () => {
    await store.createTicket({ barberId: 'b1', customerName: 'Ana', serviceId: 's1' });
    await store.moveNext('b1');
    await store.movePrevious('b1');
    await store.deleteTicket('t1');
    await store.cancelTicketsForBarber('b1');
    await store.bootstrap();
    await store.closeDay();
    await store.openDay(['b1']);

    expect(repositoryMock.createTicket).toHaveBeenCalled();
    expect(repositoryMock.moveNext).toHaveBeenCalledWith('b1');
    expect(repositoryMock.movePrevious).toHaveBeenCalledWith('b1');
    expect(repositoryMock.deleteTicket).toHaveBeenCalledWith('t1');
    expect(repositoryMock.cancelTicketsForBarber).toHaveBeenCalledWith('b1');
    expect(settingsStoreMock.bootstrap).toHaveBeenCalled();
    expect(settingsStoreMock.closeDay).toHaveBeenCalled();
    expect(settingsStoreMock.openDay).toHaveBeenCalledWith(['b1']);
  });
});
