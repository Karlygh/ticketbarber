import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { proGuard } from './pro.guard';
import { AuthStore } from '../stores/auth.store';
import { SubscriptionStore } from '../stores/subscription.store';

describe('proGuard', () => {
  let router: Router;

  const authStoreMock = {
    waitUntilReady: jasmine.createSpy('waitUntilReady').and.resolveTo(),
    isAuthenticated: jasmine.createSpy('isAuthenticated')
  };

  const subscriptionStoreMock = {
    loading: jasmine.createSpy('loading'),
    profileReady: jasmine.createSpy('profileReady'),
    hasAccess: jasmine.createSpy('hasAccess'),
    trialExpiresAt: jasmine.createSpy('trialExpiresAt')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock },
        { provide: SubscriptionStore, useValue: subscriptionStoreMock }
      ]
    });
    router = TestBed.inject(Router);
    authStoreMock.waitUntilReady.calls.reset();
    authStoreMock.isAuthenticated.calls.reset();
    subscriptionStoreMock.loading.calls.reset();
    subscriptionStoreMock.profileReady.calls.reset();
    subscriptionStoreMock.hasAccess.calls.reset();
    subscriptionStoreMock.trialExpiresAt.calls.reset();
  });

  it('redirects unauthenticated users to login with a safe returnUrl', async () => {
    authStoreMock.isAuthenticated.and.returnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      proGuard({} as never, { url: '//evil.site' } as never)
    );

    expect(router.serializeUrl(result as never)).toBe('/staff/login?reason=auth-required&returnUrl=%2Fstaff');
  });

  it('allows authenticated users with active access', async () => {
    authStoreMock.isAuthenticated.and.returnValue(true);
    subscriptionStoreMock.loading.and.returnValue(false);
    subscriptionStoreMock.profileReady.and.returnValue(true);
    subscriptionStoreMock.hasAccess.and.returnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      proGuard({} as never, { url: '/staff' } as never)
    );

    expect(result).toBeTrue();
  });

  it('redirects to pricing with trial-expired reason when trial ended', async () => {
    authStoreMock.isAuthenticated.and.returnValue(true);
    subscriptionStoreMock.loading.and.returnValue(false);
    subscriptionStoreMock.profileReady.and.returnValue(true);
    subscriptionStoreMock.hasAccess.and.returnValue(false);
    subscriptionStoreMock.trialExpiresAt.and.returnValue(new Date(Date.now() - 60_000));

    const result = await TestBed.runInInjectionContext(() =>
      proGuard({} as never, { url: '/staff/tv/setup' } as never)
    );

    expect(router.serializeUrl(result as never)).toBe('/pricing?reason=trial-expired');
  });
});
