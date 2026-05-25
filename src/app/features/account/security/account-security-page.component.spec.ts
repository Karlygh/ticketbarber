jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AccountSecurityPageComponent } from './account-security-page.component';
import { AuthStore } from '../../../core/stores/auth.store';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { SubscriptionStore } from '../../../core/stores/subscription.store';

const userSignal = signal<any>(null);

const mockAuthStore = { user: userSignal, isAuthenticated: signal(false), signOut: jest.fn() };
const mockSubscriptionStore = { subscriptionStatus: signal('no-subscription' as any), trialDaysLeft: signal(0) };

describe('AccountSecurityPageComponent', () => {
  let component: AccountSecurityPageComponent;

  function configure(user: any) {
    userSignal.set(user);
    TestBed.configureTestingModule({
      imports: [AccountSecurityPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore }
      ]
    });
    const fixture = TestBed.createComponent(AccountSecurityPageComponent);
    component = fixture.componentInstance;
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('isGoogleLinked', () => {
    it('returns true when google.com is in providerData', () => {
      configure({ providerData: [{ providerId: 'google.com', email: 'u@g.com' }], email: 'u@g.com' });
      expect(component.isGoogleLinked()).toBe(true);
    });

    it('returns false when no google provider is present', () => {
      configure({ providerData: [], email: 'u@other.com' });
      expect(component.isGoogleLinked()).toBe(false);
    });

    it('returns false when user is null', () => {
      configure(null);
      expect(component.isGoogleLinked()).toBe(false);
    });
  });

  describe('linkedEmail', () => {
    it('returns the email from the google provider', () => {
      configure({ providerData: [{ providerId: 'google.com', email: 'g@g.com' }], email: 'other@g.com' });
      expect(component.linkedEmail()).toBe('g@g.com');
    });

    it('falls back to user email when no google provider', () => {
      configure({ providerData: [], email: 'fallback@g.com' });
      expect(component.linkedEmail()).toBe('fallback@g.com');
    });

    it('returns empty string when user is null', () => {
      configure(null);
      expect(component.linkedEmail()).toBe('');
    });
  });

  describe('window.open calls', () => {
    let openSpy: jest.SpyInstance;

    beforeEach(() => {
      configure({ providerData: [], email: 'u@test.com' });
      openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    });

    it('openGoogleSecurity opens myaccount security page', () => {
      component.openGoogleSecurity();
      expect(openSpy).toHaveBeenCalledWith('https://myaccount.google.com/security', '_blank', 'noopener,noreferrer');
    });

    it('openGooglePassword opens myaccount password page', () => {
      component.openGooglePassword();
      expect(openSpy).toHaveBeenCalledWith('https://myaccount.google.com/signinoptions/password', '_blank', 'noopener,noreferrer');
    });

    it('openGoogle2FA opens two-step verification page', () => {
      component.openGoogle2FA();
      expect(openSpy).toHaveBeenCalledWith('https://myaccount.google.com/two-step-verification', '_blank', 'noopener,noreferrer');
    });
  });
});
