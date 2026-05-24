import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, Router } from '@angular/router';
import { staffGuestGuard } from './staff-guest.guard';
import { AuthStore } from '../stores/auth.store';

describe('staffGuestGuard', () => {
  let router: Router;
  const authStoreMock = {
    waitUntilReady: jasmine.createSpy('waitUntilReady').and.resolveTo(),
    isAuthenticated: jasmine.createSpy('isAuthenticated')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock }
      ]
    });
    router = TestBed.inject(Router);
    authStoreMock.waitUntilReady.calls.reset();
    authStoreMock.isAuthenticated.calls.reset();
  });

  it('allows guest users into auth pages', async () => {
    authStoreMock.isAuthenticated.and.returnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      staffGuestGuard({ queryParamMap: convertToParamMap({}) } as never, {} as never)
    );

    expect(result).toBeTrue();
  });

  it('redirects authenticated users to a safe internal path', async () => {
    authStoreMock.isAuthenticated.and.returnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      staffGuestGuard(
        { queryParamMap: convertToParamMap({ returnUrl: '//attacker.tld' }) } as never,
        {} as never
      )
    );

    expect(authStoreMock.waitUntilReady).toHaveBeenCalled();
    expect(router.serializeUrl(result as never)).toBe('/staff');
  });
});
