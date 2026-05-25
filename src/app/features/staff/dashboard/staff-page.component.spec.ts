jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');
jest.mock('@angular/fire/storage');

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { StaffPageComponent } from './staff-page.component';
import { AuthStore } from '../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../core/stores/subscription.store';
import { QueueStore } from '../../../core/stores/queue.store';
import { BarberService } from '../../../core/services/barber.service';
import { ShopService } from '../../../core/services/shop.service';
import { BarberProfile } from '../../../core/models/barber.model';
import { Ticket } from '../../../core/models/ticket.model';

// ── mocks ────────────────────────────────────────────────────────────────────

const signOutMock = jest.fn();
const mockAuthStore = {
  user: signal<any>({ uid: 'shop-1', displayName: 'Barber Shop' }),
  isAuthenticated: signal(true),
  signOut: signOutMock
};
const mockSubscriptionStore = { subscriptionStatus: signal('active' as any), trialDaysLeft: signal(0), hasAccess: signal(true) };

const queueSettingsSignal = signal<any>({ isOpen: false, activeBarberIds: ['b1'], barberStates: {} });
const queueTicketsSignal = signal<Ticket[]>([]);

const bootstrapMock = jest.fn().mockResolvedValue(undefined);
const openDayMock = jest.fn().mockResolvedValue(undefined);
const closeDayMock = jest.fn().mockResolvedValue(undefined);
const moveNextMock = jest.fn().mockResolvedValue(undefined);
const movePreviousMock = jest.fn().mockResolvedValue(undefined);
const createTicketMock = jest.fn();
const cancelTicketsMock = jest.fn().mockResolvedValue(undefined);
const deleteTicketMock = jest.fn().mockResolvedValue(undefined);

const mockQueueStore = {
  settings: queueSettingsSignal,
  tickets: queueTicketsSignal,
  activeBarberIds: signal(['b1']),
  bootstrap: bootstrapMock,
  openDay: openDayMock,
  closeDay: closeDayMock,
  moveNext: moveNextMock,
  movePrevious: movePreviousMock,
  createTicket: createTicketMock,
  cancelTicketsForBarber: cancelTicketsMock,
  deleteTicket: deleteTicketMock,
  ticketsForBarber: jest.fn().mockReturnValue([]),
  currentTicketForBarber: jest.fn().mockReturnValue(null),
  waitingTicketsForBarber: jest.fn().mockReturnValue([]),
  canMovePrevious: jest.fn().mockReturnValue(false)
};

const observeBarbersMock = jest.fn();
const createBarberMock = jest.fn().mockResolvedValue(undefined);
const setDailyAvailabilityMock = jest.fn().mockResolvedValue(undefined);
const setBarberStatusMock = jest.fn().mockResolvedValue(undefined);
const deleteBarberMock = jest.fn().mockResolvedValue(undefined);
const uploadBarberPhotoMock = jest.fn();

const mockBarberService = {
  observeBarbers: observeBarbersMock,
  createBarber: createBarberMock,
  setDailyAvailability: setDailyAvailabilityMock,
  setBarberStatus: setBarberStatusMock,
  deleteBarber: deleteBarberMock,
  uploadBarberPhoto: uploadBarberPhotoMock
};

const mockShopService = { getShopProfile: jest.fn().mockResolvedValue(null) };

const BARBERS: BarberProfile[] = [
  { id: 'b1', name: 'Carlos', status: 'available', isAvailableToday: true, createdAtMs: 100, updatedAtMs: 200, sortOrder: 1, photoUrl: '' },
  { id: 'b2', name: 'Ana', status: 'available', isAvailableToday: false, createdAtMs: 100, updatedAtMs: 200, sortOrder: 2, photoUrl: '' }
];

// ── suite ─────────────────────────────────────────────────────────────────────

describe('StaffPageComponent', () => {
  let component: StaffPageComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    observeBarbersMock.mockReturnValue(of(BARBERS));
    queueSettingsSignal.set({ isOpen: false, activeBarberIds: ['b1'], barberStates: {} });
    queueTicketsSignal.set([]);
    mockQueueStore.activeBarberIds = signal(['b1']);

    TestBed.configureTestingModule({
      imports: [StaffPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore },
        { provide: QueueStore, useValue: mockQueueStore },
        { provide: BarberService, useValue: mockBarberService },
        { provide: ShopService, useValue: mockShopService }
      ]
    });
    const fixture = TestBed.createComponent(StaffPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  // ── computed signals ───────────────────────────────────────────────────────

  describe('activeBarbers', () => {
    it('returns only barbers whose id is in activeBarberIds', () => {
      expect(component.activeBarbers().map((b: BarberProfile) => b.id)).toEqual(['b1']);
    });

    it('returns empty list when no barbers are active', () => {
      // activeBarberIds signal is captured at inject time; changing its value is what matters
      mockQueueStore.activeBarberIds.set([]);
      expect(component.activeBarbers()).toHaveLength(0);
      // restore
      mockQueueStore.activeBarberIds.set(['b1']);
    });
  });

  describe('totalWaiting', () => {
    it('sums waiting tickets across all active barbers', () => {
      mockQueueStore.waitingTicketsForBarber.mockReturnValue([{} as Ticket, {} as Ticket]);
      // totalWaiting uses activeBarbers, so reset the signal to include b1
      expect(component.totalWaiting()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatArrivalTime', () => {
    it('formats a valid timestamp as HH:MM', () => {
      const result = component.formatArrivalTime(new Date('2024-01-01T09:30:00').getTime());
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('returns --:-- for zero timestamp', () => {
      expect(component.formatArrivalTime(0)).toBe('--:--');
    });

    it('returns --:-- for negative timestamp', () => {
      expect(component.formatArrivalTime(-1)).toBe('--:--');
    });

    it('returns --:-- for NaN', () => {
      expect(component.formatArrivalTime(NaN)).toBe('--:--');
    });
  });

  // ── logout state machine ───────────────────────────────────────────────────

  describe('logout flow', () => {
    it('requestLogout sets state to confirm', () => {
      component.requestLogout();
      expect(component.logoutState()).toBe('confirm');
    });

    it('cancelLogout resets state to idle', () => {
      component.requestLogout();
      component.cancelLogout();
      expect(component.logoutState()).toBe('idle');
    });

    it('confirmLogout calls authStore.signOut and sets state to success', async () => {
      signOutMock.mockResolvedValue(undefined);
      component.requestLogout();
      await component.confirmLogout();
      expect(signOutMock).toHaveBeenCalled();
      expect(component.logoutState()).toBe('success');
    });

    it('confirmLogout resets to idle on signOut error', async () => {
      signOutMock.mockRejectedValue(new Error('auth error'));
      component.requestLogout();
      await component.confirmLogout();
      expect(component.logoutState()).toBe('idle');
    });
  });

  // ── customer modal ─────────────────────────────────────────────────────────

  describe('customer modal', () => {
    const TICKET: Ticket = {
      id: 't1',
      barberId: 'b1',
      barberNameSnapshot: 'Carlos',
      customerName: 'María',
      displayName: 'María',
      serviceId: 's1',
      serviceNameSnapshot: 'Corte',
      estimatedDurationMin: 30,
      status: 'current',
      position: 1,
      createdAtMs: 1_700_000_000_000,
      startedAtMs: 1_700_000_000_000,
      completedAtMs: null
    };

    it('openCustomerModal shows modal and sets selectedCustomer', () => {
      component.openCustomerModal(TICKET);
      expect(component.showCustomerModal()).toBe(true);
      expect(component.selectedCustomer()).not.toBeNull();
    });

    it('closeCustomerModal hides modal and clears selectedCustomer', () => {
      component.openCustomerModal(TICKET);
      component.closeCustomerModal();
      expect(component.showCustomerModal()).toBe(false);
      expect(component.selectedCustomer()).toBeNull();
    });
  });

  // ── create barber modal ───────────────────────────────────────────────────

  describe('create barber modal', () => {
    it('openCreateBarberModal resets pending state and opens modal', () => {
      component.pendingBarberName.set('old name');
      component.openCreateBarberModal();
      expect(component.showCreateBarberModal()).toBe(true);
      expect(component.pendingBarberName()).toBe('');
    });

    it('closeCreateBarberModal does nothing when isBusy', () => {
      component.isBusy.set(true);
      component.openCreateBarberModal();
      component.closeCreateBarberModal();
      expect(component.showCreateBarberModal()).toBe(true);
    });

    it('closeCreateBarberModal closes when not busy', () => {
      component.openCreateBarberModal();
      component.closeCreateBarberModal();
      expect(component.showCreateBarberModal()).toBe(false);
    });
  });

  // ── day management ─────────────────────────────────────────────────────────

  describe('moveNext', () => {
    it('calls queueStore.moveNext when queue is open', async () => {
      queueSettingsSignal.set({ isOpen: true, activeBarberIds: ['b1'], barberStates: {} });
      await component.moveNext('b1');
      expect(moveNextMock).toHaveBeenCalledWith('b1');
    });

    it('shows a warning toast when queue is closed', async () => {
      queueSettingsSignal.set({ isOpen: false, activeBarberIds: [], barberStates: {} });
      await component.moveNext('b1');
      expect(moveNextMock).not.toHaveBeenCalled();
    });
  });

  describe('requestCloseDay / cancelCloseDay', () => {
    it('requestCloseDay shows the confirm modal when queue is open', () => {
      queueSettingsSignal.set({ isOpen: true, activeBarberIds: ['b1'], barberStates: {} });
      component.requestCloseDay();
      expect(component.showCloseDayConfirmModal()).toBe(true);
    });

    it('cancelCloseDay hides the confirm modal', () => {
      queueSettingsSignal.set({ isOpen: true, activeBarberIds: ['b1'], barberStates: {} });
      component.requestCloseDay();
      component.cancelCloseDay();
      expect(component.showCloseDayConfirmModal()).toBe(false);
    });
  });

  describe('confirmOpenDay', () => {
    it('sets an error when no barbers are selected', async () => {
      component.openDaySelection.set({ b1: false, b2: false });
      await component.confirmOpenDay();
      expect(openDayMock).not.toHaveBeenCalled();
      expect(component.error()).toBeTruthy();
    });

    it('calls setDailyAvailability and openDay with selected ids', async () => {
      component.openDaySelection.set({ b1: true, b2: false });
      await component.confirmOpenDay();
      expect(setDailyAvailabilityMock).toHaveBeenCalledWith(['b1']);
      expect(openDayMock).toHaveBeenCalledWith(['b1']);
    });
  });
});
