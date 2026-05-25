jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { ActivateTvComponent } from './activate-tv.component';
import { TvAuthService } from '../../../../core/services/tv-auth.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../../core/stores/subscription.store';
import { ActivatedRoute } from '@angular/router';

const validateBindingMock = jest.fn();
const redeemCodeMock = jest.fn();

const mockTvAuthService = {
  validateBinding: validateBindingMock,
  redeemCode: redeemCodeMock
};

const mockAuthStore = { user: signal<any>({ uid: 'shop-1' }), isAuthenticated: signal(true), signOut: jest.fn() };
const mockSubscriptionStore = { subscriptionStatus: signal('active' as any), trialDaysLeft: signal(0) };

const mockRoute = {
  snapshot: {
    queryParamMap: { get: (_key: string) => null }
  }
};

describe('ActivateTvComponent', () => {
  let component: ActivateTvComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    validateBindingMock.mockResolvedValue({ valid: false, reason: 'missing' });

    TestBed.configureTestingModule({
      imports: [ActivateTvComponent],
      providers: [
        provideRouter([]),
        { provide: TvAuthService, useValue: mockTvAuthService },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore },
        { provide: ActivatedRoute, useValue: mockRoute }
      ]
    });
    const fixture = TestBed.createComponent(ActivateTvComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('formattedCode getter', () => {
    it('inserts a dash after the third digit', () => {
      component.rawCode.set('123456');
      expect(component.formattedCode).toBe('123-456');
    });

    it('returns short codes without a dash', () => {
      component.rawCode.set('12');
      expect(component.formattedCode).toBe('12');
    });

    it('returns empty string for empty code', () => {
      component.rawCode.set('');
      expect(component.formattedCode).toBe('');
    });
  });

  describe('activate', () => {
    it('sets error state when code has fewer than 6 digits', async () => {
      component.rawCode.set('123');
      await component.activate();
      expect(component.status()).toBe('error');
      expect(component.errorMsg()).toContain('6 dígitos');
    });

    it('calls redeemCode and sets status to success on valid code', async () => {
      component.rawCode.set('123456');
      redeemCodeMock.mockResolvedValue(undefined);
      await component.activate();
      expect(redeemCodeMock).toHaveBeenCalledWith('123456');
      expect(component.status()).toBe('success');
    });

    it('sets error state when redeemCode rejects', async () => {
      component.rawCode.set('123456');
      redeemCodeMock.mockRejectedValue(new Error('Código inválido'));
      await component.activate();
      expect(component.status()).toBe('error');
      expect(component.errorMsg()).toBe('Código inválido');
    });
  });

  describe('ngOnInit', () => {
    it('sets status to already-linked when binding is already valid', async () => {
      validateBindingMock.mockResolvedValue({ valid: true, shopId: 'shop-1' });
      await component.ngOnInit();
      expect(component.status()).toBe('already-linked');
    });

    it('sets status to idle when binding is invalid', async () => {
      validateBindingMock.mockResolvedValue({ valid: false, reason: 'expired' });
      await component.ngOnInit();
      expect(component.status()).toBe('idle');
    });
  });
});
