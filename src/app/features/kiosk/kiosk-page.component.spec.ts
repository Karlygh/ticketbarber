jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');
jest.mock('@angular/fire/storage');

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { KioskPageComponent } from './kiosk-page.component';
import { QueueStore } from '../../core/stores/queue.store';
import { AuthStore } from '../../core/stores/auth.store';
import { SubscriptionStore } from '../../core/stores/subscription.store';
import { BarberService } from '../../core/services/barber.service';
import { ShopService } from '../../core/services/shop.service';
import { BarberProfile } from '../../core/models/barber.model';

const createTicketMock = jest.fn();
const observeBarbersMock = jest.fn();
const getShopProfileMock = jest.fn();

const settingsSignal = signal<any>({ isOpen: true, activeBarberIds: ['b1'] });

const mockQueueStore = {
  settings: settingsSignal,
  createTicket: createTicketMock,
  tickets: signal<any[]>([]),
  activeBarberIds: signal(['b1']),
  services: signal<any[]>([])
};

const mockAuthStore = {
  user: signal<any>({ uid: 'shop-1' }),
  isAuthenticated: signal(true),
  signOut: jest.fn()
};

const mockSubscriptionStore = { subscriptionStatus: signal('active' as any), trialDaysLeft: signal(0), hasAccess: signal(true) };

const BARBERS: BarberProfile[] = [
  { id: 'b1', name: 'Carlos', status: 'available', isAvailableToday: true, createdAtMs: 100, updatedAtMs: 200, sortOrder: 1, photoUrl: '' },
  { id: 'b2', name: 'Ana', status: 'hidden', isAvailableToday: false, createdAtMs: 100, updatedAtMs: 200, sortOrder: 2, photoUrl: '' },
  { id: 'b3', name: 'Luis', status: 'available', isAvailableToday: true, createdAtMs: 100, updatedAtMs: 200, sortOrder: 3, photoUrl: '' }
];

describe('KioskPageComponent', () => {
  let component: KioskPageComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    observeBarbersMock.mockReturnValue(of(BARBERS));
    getShopProfileMock.mockResolvedValue(null);
    settingsSignal.set({ isOpen: true, activeBarberIds: ['b1'] });

    TestBed.configureTestingModule({
      imports: [KioskPageComponent],
      providers: [
        provideRouter([]),
        { provide: QueueStore, useValue: mockQueueStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore },
        { provide: BarberService, useValue: { observeBarbers: observeBarbersMock } },
        { provide: ShopService, useValue: { getShopProfile: getShopProfileMock } }
      ]
    });
    const fixture = TestBed.createComponent(KioskPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('availableBarbers computed', () => {
    it('filters out barbers that are hidden or not available today', () => {
      const available = component.availableBarbers();
      expect(available.every((b: BarberProfile) => b.isAvailableToday && b.status !== 'hidden')).toBe(true);
    });

    it('includes Carlos and Luis but excludes Ana (hidden)', () => {
      const names = component.availableBarbers().map((b: BarberProfile) => b.name);
      expect(names).toContain('Carlos');
      expect(names).toContain('Luis');
      expect(names).not.toContain('Ana');
    });
  });

  describe('selectBarber', () => {
    it('sets the barberId form control value', () => {
      component.selectBarber('b1');
      expect(component.form.controls.barberId.value).toBe('b1');
    });

    it('marks barberId control as dirty after selection', () => {
      component.selectBarber('b1');
      expect(component.form.controls.barberId.dirty).toBe(true);
    });
  });

  describe('navConfirm', () => {
    it('openStaffConfirm sets navConfirmTarget to staff', () => {
      component.openStaffConfirm();
      expect(component.navConfirmTarget()).toBe('staff');
    });

    it('openTvConfirm sets navConfirmTarget to tv', () => {
      component.openTvConfirm();
      expect(component.navConfirmTarget()).toBe('tv');
    });

    it('closeNavConfirm clears navConfirmTarget', () => {
      component.openStaffConfirm();
      component.closeNavConfirm();
      expect(component.navConfirmTarget()).toBeNull();
    });

    it('navConfirmTitle returns correct text for staff', () => {
      component.openStaffConfirm();
      expect(component.navConfirmTitle()).toContain('staff');
    });

    it('navConfirmTitle returns correct text for tv', () => {
      component.openTvConfirm();
      expect(component.navConfirmTitle()).toContain('TV');
    });

    it('proceedWithNavigation navigates to /staff when target is staff', async () => {
      const router = TestBed.inject(Router);
      const spy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      component.openStaffConfirm();
      await component.proceedWithNavigation();
      expect(spy).toHaveBeenCalledWith(['/staff']);
    });

    it('is a no-op when navConfirmTarget is null', async () => {
      const router = TestBed.inject(Router);
      const spy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      await component.proceedWithNavigation();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('submitTicket', () => {
    beforeEach(() => {
      component.form.setValue({ barberId: 'b1', serviceId: 's1', customerName: 'Ana', phone: '' });
    });

    it('does not call createTicket when form is invalid', async () => {
      component.form.controls.customerName.setValue('');
      await component.submitTicket();
      expect(createTicketMock).not.toHaveBeenCalled();
    });

    it('does not call createTicket when queue is closed', async () => {
      settingsSignal.set({ isOpen: false, activeBarberIds: [] });
      await component.submitTicket();
      expect(createTicketMock).not.toHaveBeenCalled();
    });

    it('calls createTicket and sets receipt on success', async () => {
      const receipt = { ticketId: 't1', position: 1, estimatedWaitMin: 30 };
      createTicketMock.mockResolvedValue(receipt);
      await component.submitTicket();
      expect(createTicketMock).toHaveBeenCalledWith(expect.objectContaining({ barberId: 'b1', serviceId: 's1', customerName: 'Ana' }));
      expect(component.receipt()).toEqual(receipt);
    });

    it('sets errorMessage when createTicket rejects', async () => {
      createTicketMock.mockRejectedValue(new Error('La jornada esta cerrada'));
      await component.submitTicket();
      expect(component.errorMessage()).toContain('La jornada esta cerrada');
    });
  });
});
