jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');
jest.mock('@angular/fire/storage');

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { StaffBarbersPageComponent } from './staff-barbers-page.component';
import { BarberService } from '../../../core/services/barber.service';
import { QueueStore } from '../../../core/stores/queue.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../core/stores/subscription.store';
import { BarberProfile } from '../../../core/models/barber.model';

const observeBarbersMock = jest.fn();
const updateBarberMock = jest.fn();
const deleteBarberMock = jest.fn();
const uploadBarberPhotoMock = jest.fn();

const cancelTicketsMock = jest.fn();

const mockBarberService = {
  observeBarbers: observeBarbersMock,
  updateBarber: updateBarberMock,
  deleteBarber: deleteBarberMock,
  uploadBarberPhoto: uploadBarberPhotoMock
};

const mockQueueStore = {
  activeBarberIds: signal<string[]>([]),
  settings: signal<any>({ isOpen: false, activeBarberIds: [] }),
  tickets: signal<any[]>([]),
  cancelTicketsForBarber: cancelTicketsMock
};

const mockAuthStore = { user: signal<any>({ uid: 'shop-1' }), isAuthenticated: signal(true), signOut: jest.fn() };
const mockSubscriptionStore = { subscriptionStatus: signal('active' as any), trialDaysLeft: signal(0), hasAccess: signal(true) };

const BARBER: BarberProfile = {
  id: 'b1',
  name: 'Carlos',
  status: 'available',
  isAvailableToday: true,
  createdAtMs: 1000,
  updatedAtMs: 2000,
  sortOrder: 1,
  photoUrl: ''
};

describe('StaffBarbersPageComponent', () => {
  let component: StaffBarbersPageComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    observeBarbersMock.mockReturnValue(of([BARBER]));
    updateBarberMock.mockResolvedValue(undefined);
    deleteBarberMock.mockResolvedValue(undefined);
    cancelTicketsMock.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [StaffBarbersPageComponent],
      providers: [
        provideRouter([]),
        { provide: BarberService, useValue: mockBarberService },
        { provide: QueueStore, useValue: mockQueueStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore }
      ]
    });
    const fixture = TestBed.createComponent(StaffBarbersPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('startEdit / cancelEdit / isEditing', () => {
    it('startEdit populates editing signals from the barber', () => {
      component.startEdit(BARBER);
      expect(component.editingBarberId()).toBe('b1');
      expect(component.editingName()).toBe('Carlos');
    });

    it('cancelEdit clears all editing state', () => {
      component.startEdit(BARBER);
      component.cancelEdit();
      expect(component.editingBarberId()).toBeNull();
      expect(component.editingName()).toBe('');
    });

    it('isEditing returns true only for the barber being edited', () => {
      component.startEdit(BARBER);
      expect(component.isEditing('b1')).toBe(true);
      expect(component.isEditing('b2')).toBe(false);
    });
  });

  describe('saveEdit', () => {
    it('sets an error when name is empty', async () => {
      component.startEdit(BARBER);
      component.editingName.set('  ');
      await component.saveEdit(BARBER);
      expect(updateBarberMock).not.toHaveBeenCalled();
      expect(component.error()).toBeTruthy();
    });

    it('calls updateBarber with trimmed name and sets success message', async () => {
      component.startEdit(BARBER);
      component.editingName.set('  Nuevo Nombre  ');
      await component.saveEdit(BARBER);
      expect(updateBarberMock).toHaveBeenCalledWith('b1', expect.objectContaining({ name: 'Nuevo Nombre' }));
      expect(component.success()).toBeTruthy();
    });

    it('sets error signal when updateBarber rejects', async () => {
      updateBarberMock.mockRejectedValue(new Error('Firestore error'));
      component.startEdit(BARBER);
      component.editingName.set('Valid Name');
      await component.saveEdit(BARBER);
      expect(component.error()).toContain('Firestore error');
    });
  });

  describe('requestDelete / cancelDelete', () => {
    it('requestDelete sets barberToDelete', () => {
      component.requestDelete(BARBER);
      expect(component.barberToDelete()).toEqual(BARBER);
    });

    it('cancelDelete clears barberToDelete', () => {
      component.requestDelete(BARBER);
      component.cancelDelete();
      expect(component.barberToDelete()).toBeNull();
    });
  });

  describe('confirmDelete', () => {
    it('cancels tickets and deletes barber, then shows success', async () => {
      component.requestDelete(BARBER);
      await component.confirmDelete();
      expect(cancelTicketsMock).toHaveBeenCalledWith('b1');
      expect(deleteBarberMock).toHaveBeenCalledWith('b1');
      expect(component.success()).toBeTruthy();
      expect(component.barberToDelete()).toBeNull();
    });

    it('sets error signal when deleteBarber rejects', async () => {
      deleteBarberMock.mockRejectedValue(new Error('delete failed'));
      component.requestDelete(BARBER);
      await component.confirmDelete();
      expect(component.error()).toContain('delete failed');
    });

    it('does nothing when barberToDelete is null', async () => {
      await component.confirmDelete();
      expect(deleteBarberMock).not.toHaveBeenCalled();
    });
  });

  describe('initials', () => {
    it('delegates to barberInitials utility', () => {
      const result = component.initials('Carlos Ruiz');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
