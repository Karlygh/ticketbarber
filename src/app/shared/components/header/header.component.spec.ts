jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { HeaderComponent } from './header.component';
import { AuthStore } from '../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../core/stores/subscription.store';

describe('HeaderComponent', () => {
  let component: HeaderComponent;

  const authSignOut = jest.fn().mockResolvedValue(undefined);
  const userSignal = signal<any>(null);
  const isAuthenticatedSignal = signal(false);

  const mockAuthStore = {
    user: userSignal,
    isAuthenticated: isAuthenticatedSignal,
    signOut: authSignOut
  };

  const trialDaysLeftSignal = signal(0);
  const subscriptionStatusSignal = signal<any>('no-subscription');

  const mockSubscriptionStore = {
    subscriptionStatus: subscriptionStatusSignal,
    trialDaysLeft: trialDaysLeftSignal
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userSignal.set(null);
    isAuthenticatedSignal.set(false);
    trialDaysLeftSignal.set(0);
    subscriptionStatusSignal.set('no-subscription');

    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore }
      ]
    });

    const fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  // ─── accountLabel ─────────────────────────────────────────────────────────

  describe('accountLabel', () => {
    it('returns displayName when user has one', () => {
      userSignal.set({ displayName: 'Carlos', email: 'carlos@test.com' });
      expect(component.accountLabel).toBe('Hola, Carlos');
    });

    it('falls back to email when displayName is null', () => {
      userSignal.set({ displayName: null, email: 'carlos@test.com' });
      expect(component.accountLabel).toBe('Hola, carlos@test.com');
    });

    it('falls back to Mi cuenta when user is null', () => {
      userSignal.set(null);
      expect(component.accountLabel).toBe('Hola, Mi cuenta');
    });
  });

  // ─── trialBadgeLabel ──────────────────────────────────────────────────────

  describe('trialBadgeLabel', () => {
    it('returns singular form when 1 day remains', () => {
      trialDaysLeftSignal.set(1);
      expect(component.trialBadgeLabel).toBe('1 día de prueba');
    });

    it('returns plural form when multiple days remain', () => {
      trialDaysLeftSignal.set(7);
      expect(component.trialBadgeLabel).toBe('7 días de prueba');
    });

    it('returns expired label when 0 days remain', () => {
      trialDaysLeftSignal.set(0);
      expect(component.trialBadgeLabel).toBe('Prueba expirada');
    });
  });

  // ─── mobile menu ──────────────────────────────────────────────────────────

  describe('toggleMobileMenu', () => {
    it('opens the mobile menu when it is closed', () => {
      expect(component.mobileMenuOpen()).toBe(false);
      component.toggleMobileMenu();
      expect(component.mobileMenuOpen()).toBe(true);
    });

    it('closes the user menu when toggling mobile menu', () => {
      component.userMenuOpen.set(true);
      component.toggleMobileMenu();
      expect(component.userMenuOpen()).toBe(false);
    });

    it('closeMobileMenu sets both menus to false', () => {
      component.mobileMenuOpen.set(true);
      component.userMenuOpen.set(true);
      component.closeMobileMenu();
      expect(component.mobileMenuOpen()).toBe(false);
      expect(component.userMenuOpen()).toBe(false);
    });
  });

  // ─── user menu ────────────────────────────────────────────────────────────

  describe('toggleUserMenu', () => {
    it('opens the user menu when it is closed', () => {
      expect(component.userMenuOpen()).toBe(false);
      component.toggleUserMenu();
      expect(component.userMenuOpen()).toBe(true);
    });

    it('closeUserMenu sets userMenuOpen to false', () => {
      component.userMenuOpen.set(true);
      component.closeUserMenu();
      expect(component.userMenuOpen()).toBe(false);
    });
  });

  // ─── signOut ──────────────────────────────────────────────────────────────

  describe('signOut', () => {
    it('calls authStore.signOut and navigates to root', async () => {
      const router = TestBed.inject(Router);
      const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      await component.signOut();

      expect(authSignOut).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith('/');
    });

    it('closes both menus before signing out', async () => {
      component.mobileMenuOpen.set(true);
      component.userMenuOpen.set(true);
      jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      await component.signOut();

      expect(component.mobileMenuOpen()).toBe(false);
      expect(component.userMenuOpen()).toBe(false);
    });
  });
});
