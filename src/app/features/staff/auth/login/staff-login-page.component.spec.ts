jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { StaffLoginPageComponent } from './staff-login-page.component';
import { AuthStore } from '../../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../../core/stores/subscription.store';

const signInWithGoogleMock = jest.fn();
const mockAuthStore = {
  user: signal<any>(null),
  isAuthenticated: signal(false),
  signOut: jest.fn(),
  signInWithGoogle: signInWithGoogleMock
};
const mockSubscriptionStore = { subscriptionStatus: signal('no-subscription' as any), trialDaysLeft: signal(0) };

function buildRoute(queryParams: Record<string, string> = {}) {
  return {
    snapshot: {
      queryParamMap: {
        get: (key: string) => queryParams[key] ?? null
      }
    }
  };
}

describe('StaffLoginPageComponent', () => {
  let component: StaffLoginPageComponent;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [StaffLoginPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore },
        { provide: ActivatedRoute, useValue: buildRoute(queryParams) }
      ]
    });
    const fixture = TestBed.createComponent(StaffLoginPageComponent);
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

  describe('computed getters', () => {
    it('isLoading returns true only when state is loading', () => {
      configure();
      expect(component.isLoading).toBe(false);
    });

    it('showAuthRequiredNotice returns true when reason=auth-required', () => {
      configure({ reason: 'auth-required' });
      expect(component.showAuthRequiredNotice).toBe(true);
    });

    it('showAuthRequiredNotice returns false when reason is absent', () => {
      configure();
      expect(component.showAuthRequiredNotice).toBe(false);
    });
  });

  describe('signIn', () => {
    it('sets state to success after a successful Google sign-in', async () => {
      configure();
      signInWithGoogleMock.mockResolvedValue(undefined);
      await component.signIn();
      expect(component.loginState()).toBe('success');
    });

    it('sets errorMsg and state to error on auth/popup-closed-by-user', async () => {
      configure();
      signInWithGoogleMock.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
      await component.signIn();
      expect(component.loginState()).toBe('error');
      expect(component.errorMsg()).toContain('cerrado la ventana');
    });

    it('sets errorMsg and state to error on auth/popup-blocked', async () => {
      configure();
      signInWithGoogleMock.mockRejectedValue({ code: 'auth/popup-blocked' });
      await component.signIn();
      expect(component.loginState()).toBe('error');
      expect(component.errorMsg()).toContain('navegador ha bloqueado');
    });

    it('sets errorMsg and state to error on auth/network-request-failed', async () => {
      configure();
      signInWithGoogleMock.mockRejectedValue({ code: 'auth/network-request-failed' });
      await component.signIn();
      expect(component.loginState()).toBe('error');
      expect(component.errorMsg()).toContain('conectar con Google');
    });

    it('sets a generic errorMsg for unknown error codes', async () => {
      configure();
      signInWithGoogleMock.mockRejectedValue({ code: 'auth/unknown' });
      await component.signIn();
      expect(component.loginState()).toBe('error');
      expect(component.errorMsg()).toContain('iniciar sesion');
    });

    it('schedules a redirect after success', async () => {
      configure();
      const router = TestBed.inject(Router);
      const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      signInWithGoogleMock.mockResolvedValue(undefined);
      await component.signIn();
      jest.runAllTimers();
      expect(navigateSpy).toHaveBeenCalled();
    });
  });
});
