jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');

import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { DevicesManagementComponent } from './devices-management.component';
import { TvAuthService, DeviceDoc } from '../../../../core/services/tv-auth.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../../core/stores/subscription.store';

const watchDevicesMock = jest.fn();
const renameDeviceMock = jest.fn();
const unlinkDeviceMock = jest.fn();

const mockTvAuthService = {
  watchDevices: watchDevicesMock,
  renameDevice: renameDeviceMock,
  unlinkDevice: unlinkDeviceMock
};

const mockAuthStore = { user: signal<any>({ uid: 'shop-1' }), isAuthenticated: signal(true), signOut: jest.fn() };
const mockSubscriptionStore = { subscriptionStatus: signal('active' as any), trialDaysLeft: signal(0), hasAccess: signal(true) };

const DEVICE: DeviceDoc = {
  deviceId: 'dev-1',
  userId: 'shop-1',
  name: 'TV Sala',
  createdAt: Date.now(),
  lastSeen: Date.now()
};

describe('DevicesManagementComponent', () => {
  let component: DevicesManagementComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    watchDevicesMock.mockReturnValue(of([]));
    renameDeviceMock.mockResolvedValue(undefined);
    unlinkDeviceMock.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [DevicesManagementComponent],
      providers: [
        provideRouter([]),
        { provide: TvAuthService, useValue: mockTvAuthService },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore }
      ]
    });
    const fixture = TestBed.createComponent(DevicesManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('ngOnInit', () => {
    it('subscribes to watchDevices and populates the devices signal', () => {
      watchDevicesMock.mockReturnValue(of([DEVICE]));
      const fixture = TestBed.createComponent(DevicesManagementComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.devices()).toHaveLength(1);
      expect(c.devices()[0].deviceId).toBe('dev-1');
    });
  });

  describe('startRename / cancelRename', () => {
    it('sets renamingId and prefills newName', () => {
      component.startRename(DEVICE);
      expect(component.renamingId()).toBe('dev-1');
      expect(component.newName()).toBe('TV Sala');
    });

    it('cancelRename clears renaming state', () => {
      component.startRename(DEVICE);
      component.cancelRename();
      expect(component.renamingId()).toBeNull();
      expect(component.newName()).toBe('');
    });
  });

  describe('confirmRename', () => {
    it('calls renameDevice and clears renaming state', async () => {
      component.startRename(DEVICE);
      await component.confirmRename();
      expect(renameDeviceMock).toHaveBeenCalledWith('dev-1', 'TV Sala');
      expect(component.renamingId()).toBeNull();
    });

    it('does nothing when renamingId is null', async () => {
      await component.confirmRename();
      expect(renameDeviceMock).not.toHaveBeenCalled();
    });

    it('does nothing when name is empty after trim', async () => {
      component.renamingId.set('dev-1');
      component.newName.set('   ');
      await component.confirmRename();
      expect(renameDeviceMock).not.toHaveBeenCalled();
    });
  });

  describe('unlink', () => {
    it('sets unlinkingId during the operation', async () => {
      let capturedId: string | null = null;
      unlinkDeviceMock.mockImplementation(() => {
        capturedId = component.unlinkingId();
        return Promise.resolve();
      });
      await component.unlink('dev-1');
      expect(capturedId).toBe('dev-1');
      expect(component.unlinkingId()).toBeNull();
    });

    it('clears unlinkingId even when unlinkDevice rejects', async () => {
      unlinkDeviceMock.mockRejectedValue(new Error('network error'));
      await expect(component.unlink('dev-1')).rejects.toThrow('network error');
      expect(component.unlinkingId()).toBeNull();
    });
  });

  describe('formatLastSeen', () => {
    it('returns "ahora mismo" for timestamps within the last minute', () => {
      expect(component.formatLastSeen(Date.now() - 30_000)).toBe('ahora mismo');
    });

    it('returns relative minutes', () => {
      expect(component.formatLastSeen(Date.now() - 5 * 60_000)).toBe('hace 5 min');
    });

    it('returns relative hours', () => {
      expect(component.formatLastSeen(Date.now() - 3 * 3_600_000)).toBe('hace 3 h');
    });

    it('returns relative days', () => {
      expect(component.formatLastSeen(Date.now() - 2 * 24 * 3_600_000)).toBe('hace 2 días');
    });
  });
});
