jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { TvAuthService } from '../../../core/services/tv-auth.service';
import { TvPairingComponent } from './tv-pairing.component';
import { AuthStore } from '../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../core/stores/subscription.store';

const ensurePairingCodeMock = jest.fn();
const mockTvAuthService = { ensurePairingCode: ensurePairingCodeMock };

const mockAuthStore = { user: signal<any>({ uid: 'shop-1' }), isAuthenticated: signal(true), signOut: jest.fn() };
const mockSubscriptionStore = { subscriptionStatus: signal('active' as any), trialDaysLeft: signal(0), hasAccess: signal(true) };

describe('TvPairingComponent', () => {
  let component: TvPairingComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    ensurePairingCodeMock.mockResolvedValue({ code: '123456', expiresAt: Date.now() + 120_000 });

    TestBed.configureTestingModule({
      imports: [TvPairingComponent],
      providers: [
        provideRouter([]),
        { provide: TvAuthService, useValue: mockTvAuthService },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore }
      ]
    });
    const fixture = TestBed.createComponent(TvPairingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('formattedCode computed', () => {
    it('inserts a dash between the 3rd and 4th character', () => {
      component.code.set('123456');
      expect(component.formattedCode()).toBe('123-456');
    });

    it('returns empty string when code is empty', () => {
      component.code.set('');
      expect(component.formattedCode()).toBe('');
    });
  });

  describe('secondsLeft computed', () => {
    it('returns 0 when expiresAt is 0', () => {
      component.expiresAt.set(0);
      expect(component.secondsLeft()).toBe(0);
    });

    it('returns positive value when expiry is in the future', () => {
      component.expiresAt.set(Date.now() + 60_000);
      component.now.set(Date.now());
      expect(component.secondsLeft()).toBeGreaterThan(0);
    });

    it('returns 0 when code has expired', () => {
      component.expiresAt.set(Date.now() - 1000);
      component.now.set(Date.now());
      expect(component.secondsLeft()).toBe(0);
    });
  });

  describe('confirmGenerateCode', () => {
    it('closes the confirmation modal and loads a new code', async () => {
      expect(component.confirmModalOpen()).toBe(true);
      await component.confirmGenerateCode();
      expect(component.confirmModalOpen()).toBe(false);
      expect(ensurePairingCodeMock).toHaveBeenCalled();
    });

    it('sets status to ready when code is loaded with future expiry', async () => {
      await component.confirmGenerateCode();
      expect(component.status()).toBe('ready');
    });

    it('sets status to expired when code has already expired', async () => {
      ensurePairingCodeMock.mockResolvedValue({ code: '999888', expiresAt: Date.now() - 1000 });
      await component.confirmGenerateCode();
      expect(component.status()).toBe('expired');
    });

    it('sets status to error when service rejects', async () => {
      ensurePairingCodeMock.mockRejectedValue(new Error('network fail'));
      await component.confirmGenerateCode();
      expect(component.status()).toBe('error');
      expect(component.errorMsg()).toBeTruthy();
    });
  });

  describe('cancelGenerateCode', () => {
    it('closes the confirmation modal without loading a code', () => {
      component.cancelGenerateCode();
      expect(component.confirmModalOpen()).toBe(false);
      expect(ensurePairingCodeMock).not.toHaveBeenCalled();
    });
  });
});
