jest.mock('@angular/fire/firestore');
jest.mock('@angular/fire/auth');

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  writeBatch
} from '@angular/fire/firestore';
import { QueueRepository } from './queue.repository';
import { AuthStore } from '../stores/auth.store';

const collectionMock = collection as jest.Mock;
const collectionDataMock = collectionData as jest.Mock;
const docMock = doc as jest.Mock;
const docDataMock = docData as jest.Mock;
const getDocMock = getDoc as jest.Mock;
const getDocsMock = getDocs as jest.Mock;
const setDocMock = setDoc as jest.Mock;
const writeBatchMock = writeBatch as jest.Mock;
const runTransactionMock = runTransaction as jest.Mock;

const OPEN_SETTINGS = {
  isOpen: true,
  updatedAtMs: 1000,
  activeBarberIds: ['b1'],
  barberStates: { b1: { currentTicketId: null, lastAdvance: null } },
  tvView: 'barbers' as any
};

const CLOSED_SETTINGS = {
  isOpen: false,
  updatedAtMs: 2000,
  activeBarberIds: [],
  barberStates: {},
  tvView: 'barbers' as any
};

const mockAuthStoreActive = { user: () => ({ uid: 'shop-owner-uid' }) };
const mockAuthStoreInactive = { user: () => null as any };

function setupTestBed(authStore: { user: () => any } = mockAuthStoreActive) {
  TestBed.configureTestingModule({
    providers: [
      QueueRepository,
      { provide: Firestore, useValue: {} as Firestore },
      { provide: AuthStore, useValue: authStore }
    ]
  });
  return TestBed.inject(QueueRepository);
}

describe('QueueRepository', () => {
  let repo: QueueRepository;
  const mockDocRef = { id: 'mock-doc-id' } as any;
  const mockColRef = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    collectionMock.mockReturnValue(mockColRef);
    docMock.mockReturnValue(mockDocRef);
    setDocMock.mockResolvedValue(undefined);
    collectionDataMock.mockReturnValue(of([]));
    docDataMock.mockReturnValue(of(undefined));
    repo = setupTestBed();
  });

  afterEach(() => TestBed.resetTestingModule());

  // ─── shopId guard ─────────────────────────────────────────────────────────

  describe('shopId guard', () => {
    it('throws when no user is authenticated', () => {
      TestBed.resetTestingModule();
      const unauthRepo = setupTestBed(mockAuthStoreInactive);
      expect(() => (unauthRepo as any).shopId).toThrow('No hay sesion activa');
    });

    it('returns the uid of the authenticated user', () => {
      expect((repo as any).shopId).toBe('shop-owner-uid');
    });
  });

  // ─── observeServices ──────────────────────────────────────────────────────

  describe('observeServices', () => {
    it('emits services sorted alphabetically by name', () => {
      const rawServices = [
        { id: 's2', name: 'Tinte', durationMin: 60, active: true },
        { id: 's1', name: 'Afeitado', durationMin: 20, active: true },
        { id: 's3', name: 'Corte', durationMin: 30, active: true }
      ];
      collectionDataMock.mockReturnValue(of(rawServices));

      let result: any[] = [];
      repo.observeServices().subscribe((services) => { result = services; });

      expect(result.map((s: any) => s.name)).toEqual(['Afeitado', 'Corte', 'Tinte']);
    });

    it('coerces durationMin to number', () => {
      collectionDataMock.mockReturnValue(of([{ id: 's1', name: 'Corte', durationMin: '30', active: true }]));

      let result: any[] = [];
      repo.observeServices().subscribe((services) => { result = services; });

      expect(typeof result[0].durationMin).toBe('number');
      expect(result[0].durationMin).toBe(30);
    });

    it('returns empty array on Firestore error', () => {
      collectionDataMock.mockReturnValue(throwError(() => new Error('permission-denied')));

      let result: any[] | undefined;
      repo.observeServices().subscribe((services) => { result = services; });

      expect(result).toEqual([]);
    });
  });

  // ─── bootstrapDefaults ────────────────────────────────────────────────────

  describe('bootstrapDefaults', () => {
    it('creates default services and settings for a fresh shop', async () => {
      const mockBatch = { set: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) };
      writeBatchMock.mockReturnValue(mockBatch);
      getDocMock.mockResolvedValue({ exists: () => false });
      getDocsMock.mockResolvedValue({ empty: true, docs: [] });

      await repo.bootstrapDefaults();

      expect(mockBatch.set).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(setDocMock).toHaveBeenCalled();
    });

    it('does not overwrite services or settings when they already exist', async () => {
      const mockBatch = { set: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) };
      writeBatchMock.mockReturnValue(mockBatch);
      getDocMock.mockResolvedValue({ exists: () => true });
      getDocsMock.mockResolvedValue({ empty: false, docs: [{}] });

      await repo.bootstrapDefaults();

      expect(mockBatch.set).not.toHaveBeenCalled();
      expect(mockBatch.commit).not.toHaveBeenCalled();
      expect(setDocMock).not.toHaveBeenCalled();
    });
  });

  // ─── openDay ──────────────────────────────────────────────────────────────

  describe('openDay', () => {
    it('sets isOpen to true and initializes barberStates for each active barber', async () => {
      await repo.openDay(['b1', 'b2']);

      expect(setDocMock).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          isOpen: true,
          activeBarberIds: ['b1', 'b2'],
          barberStates: {
            b1: { currentTicketId: null, lastAdvance: null },
            b2: { currentTicketId: null, lastAdvance: null }
          }
        }),
        { merge: true }
      );
    });
  });

  // ─── observeTicketsForShop ────────────────────────────────────────────────

  describe('observeTicketsForShop', () => {
    it('emits mapped ticket data including idField', () => {
      const rawTickets = [
        {
          id: 't1',
          barberId: 'b1',
          status: 'current',
          position: 1,
          customerName: 'Ana',
          displayName: 'Ana',
          createdAtMs: 1000,
          startedAtMs: 1001,
          completedAtMs: null,
          serviceId: 's1',
          serviceNameSnapshot: 'Corte',
          barberNameSnapshot: 'Carlos',
          estimatedDurationMin: 30
        }
      ];
      collectionDataMock.mockReturnValue(of(rawTickets));

      let result: any[] = [];
      repo.observeTicketsForShop('shop-1').subscribe((tickets) => { result = tickets; });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ id: 't1', status: 'current' }));
    });
  });

  // ─── observeSettingsForShop ───────────────────────────────────────────────

  describe('observeSettingsForShop', () => {
    it('emits DEFAULT_QUEUE_SETTINGS when settings document is undefined', () => {
      docDataMock.mockReturnValue(of(undefined));

      let result: any;
      repo.observeSettingsForShop('shop-1').subscribe((settings) => { result = settings; });

      expect(result).toEqual(expect.objectContaining({ isOpen: false }));
    });

    it('emits DEFAULT_QUEUE_SETTINGS on Firestore error', () => {
      docDataMock.mockReturnValue(throwError(() => new Error('permission-denied')));

      let result: any;
      repo.observeSettingsForShop('shop-1').subscribe((settings) => { result = settings; });

      expect(result).toEqual(expect.objectContaining({ isOpen: false }));
    });
  });

  // ─── createTicket ─────────────────────────────────────────────────────────

  describe('createTicket', () => {
    it('throws when the queue is closed', async () => {
      getDocMock.mockResolvedValue({ exists: () => true, data: () => CLOSED_SETTINGS });
      getDocsMock.mockResolvedValue({ docs: [] });

      runTransactionMock.mockImplementation(async (_db: any, callback: any) => {
        const txn = {
          get: jest.fn().mockResolvedValueOnce({ exists: () => true, data: () => CLOSED_SETTINGS }),
          set: jest.fn(),
          update: jest.fn()
        };
        return callback(txn);
      });

      await expect(
        repo.createTicket({ barberId: 'b1', serviceId: 's1', customerName: 'Ana' })
      ).rejects.toThrow('La jornada esta cerrada');
    });

    it('creates a ticket and returns ticketId and position', async () => {
      const newTicketRef = { id: 'new-ticket-id' };
      docMock.mockReturnValue(newTicketRef);

      getDocMock.mockResolvedValue({ exists: () => true, data: () => OPEN_SETTINGS });
      getDocsMock.mockResolvedValue({ docs: [] });

      runTransactionMock.mockImplementation(async (_db: any, callback: any) => {
        const txn = {
          get: jest.fn()
            .mockResolvedValueOnce({ exists: () => true, data: () => OPEN_SETTINGS })
            .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Corte', durationMin: 30 }) })
            .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Juan', photoUrl: '' }) }),
          set: jest.fn(),
          update: jest.fn()
        };
        return callback(txn);
      });

      const result = await repo.createTicket({ barberId: 'b1', serviceId: 's1', customerName: 'Ana' });

      expect(result.ticketId).toBe('new-ticket-id');
      expect(result.position).toBe(1);
    });

    it('throws when barber is not in activeBarberIds', async () => {
      getDocMock.mockResolvedValue({ exists: () => true, data: () => OPEN_SETTINGS });
      getDocsMock.mockResolvedValue({ docs: [] });

      runTransactionMock.mockImplementation(async (_db: any, callback: any) => {
        const txn = {
          get: jest.fn()
            .mockResolvedValueOnce({ exists: () => true, data: () => OPEN_SETTINGS })
            .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Corte', durationMin: 30 }) })
            .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Juan', photoUrl: '' }) }),
          set: jest.fn(),
          update: jest.fn()
        };
        return callback(txn);
      });

      await expect(
        repo.createTicket({ barberId: 'INVALID', serviceId: 's1', customerName: 'Ana' })
      ).rejects.toThrow('Ese barbero no esta disponible');
    });
  });
});
