import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StripeService } from '../services/stripe.service';
import { UserService } from '../services/user.service';
import { AuthStore } from './auth.store';
import { SubscriptionStore } from './subscription.store';

describe('SubscriptionStore (derived state)', () => {
  let store: SubscriptionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SubscriptionStore,
        {
          provide: AuthStore,
          useValue: {
            user: () => null,
            ready: () => false
          }
        },
        { provide: StripeService, useValue: { getActiveSubscription: () => of(null) } },
        { provide: UserService, useValue: { getUserProfile: async () => null } }
      ]
    });
    store = TestBed.inject(SubscriptionStore);
  });

  it('returns free when loading ended and no subscription/trial exists', () => {
    (store as any)._loading.set(false);
    (store as any)._profileReady.set(true);
    (store as any)._subscription.set(null);
    (store as any)._trialExpiresAt.set(null);

    expect(store.subscriptionStatus()).toBe('free');
    expect(store.hasAccess()).toBeFalse();
  });

  it('returns trial-active when profile is ready and trial has not expired', () => {
    (store as any)._loading.set(false);
    (store as any)._profileReady.set(true);
    (store as any)._subscription.set(null);
    (store as any)._trialExpiresAt.set(new Date(Date.now() + 24 * 60 * 60 * 1000));

    expect(store.isTrialActive()).toBeTrue();
    expect(store.subscriptionStatus()).toBe('trial-active');
    expect(store.hasAccess()).toBeTrue();
  });

  it('returns pro-past-due for past due subscriptions', () => {
    (store as any)._loading.set(false);
    (store as any)._profileReady.set(true);
    (store as any)._subscription.set({
      id: 'sub_1',
      status: 'past_due',
      priceId: 'price_1',
      productId: 'prod_1',
      currentPeriodStart: 1000,
      currentPeriodEnd: 2000,
      cancelAtPeriodEnd: false,
      trialEnd: null
    });

    expect(store.isPastDue()).toBeTrue();
    expect(store.subscriptionStatus()).toBe('pro-past-due');
    expect(store.hasAccess()).toBeTrue();
  });
});
