jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { StaffRegisterPageComponent } from './staff-register-page.component';
import { AuthStore } from '../../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../../core/stores/subscription.store';
import { BrowserStorageService } from '../../../../core/services/browser-storage.service';

const signInWithGoogleMock = jest.fn();
const mockAuthStore = {
  user: signal<any>(null),
  isAuthenticated: signal(false),
  signOut: jest.fn(),
  signInWithGoogle: signInWithGoogleMock
};
const mockSubscriptionStore = { subscriptionStatus: signal('no-subscription' as any), trialDaysLeft: signal(0) };
const mockStorage = { getSessionItem: jest.fn().mockReturnValue(null) };

function buildRoute(queryParams: Record<string, string> = {}) {
  return {
    snapshot: {
      queryParamMap: { get: (key: string) => queryParams[key] ?? null }
    }
  };
}

describe('StaffRegisterPageComponent', () => {
  let component: StaffRegisterPageComponent;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [StaffRegisterPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore },
        { provide: BrowserStorageService, useValue: mockStorage },
        { provide: ActivatedRoute, useValue: buildRoute(queryParams) }
      ]
    });
    const fixture = TestBed.createComponent(StaffRegisterPageComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('isLoading', () => {
    it('is false initially', () => {
      configure();
      expect(component.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('sets state to success when a new user registers', async () => {
      configure();
      signInWithGoogleMock.mockResolvedValue({ isNewUser: true });
      await component.register();
      expect(component.modalState()).toBe('success');
    });

    it('sets state to returning when the user already had an account', async () => {
      configure();
      signInWithGoogleMock.mockResolvedValue({ isNewUser: false });
      await component.register();
      expect(component.modalState()).toBe('returning');
    });

    it('sets state to error and errorMsg when sign-in throws', async () => {
      configure();
      signInWithGoogleMock.mockRejectedValue(new Error('No se pudo crear la cuenta.'));
      await component.register();
      expect(component.modalState()).toBe('error');
      expect(component.errorMsg()).toContain('No se pudo crear la cuenta.');
    });

    it('schedules a redirect after success', async () => {
      configure();
      const router = TestBed.inject(Router);
      const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      signInWithGoogleMock.mockResolvedValue({ isNewUser: true });
      await component.register();
      jest.runAllTimers();
      expect(navigateSpy).toHaveBeenCalled();
    });

    it('uses returnUrl query param when present', async () => {
      configure({ returnUrl: '/staff' });
      const router = TestBed.inject(Router);
      const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      signInWithGoogleMock.mockResolvedValue({ isNewUser: true });
      await component.register();
      jest.runAllTimers();
      expect(navigateSpy).toHaveBeenCalledWith('/staff');
    });
  });

  describe('closeError', () => {
    it('resets state to idle', async () => {
      configure();
      signInWithGoogleMock.mockRejectedValue(new Error('fail'));
      await component.register();
      expect(component.modalState()).toBe('error');
      component.closeError();
      expect(component.modalState()).toBe('idle');
    });
  });
});
