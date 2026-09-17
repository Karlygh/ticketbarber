import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { staffAuthGuard } from './staff-auth.guard';
import { AuthStore } from '../stores/auth.store';

describe('staffAuthGuard', () => {
  let router: Router;
  const authStoreMock = {
    waitUntilReady: jasmine.createSpy('waitUntilReady').and.resolveTo(),
    isAuthenticated: jasmine.createSpy('isAuthenticated'),
    enforceInactivityLimit: jasmine.createSpy('enforceInactivityLimit').and.resolveTo(false)
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
    authStoreMock.enforceInactivityLimit.calls.reset();
    authStoreMock.enforceInactivityLimit.and.resolveTo(false);
  });

  it('allows authenticated users', async () => {
    authStoreMock.isAuthenticated.and.returnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      staffAuthGuard({} as never, { url: '/staff' } as never)
    );

    expect(authStoreMock.waitUntilReady).toHaveBeenCalled();
    expect(result).toBeTrue();
  });

  it('redirects guests to login with sanitized returnUrl', async () => {
    authStoreMock.isAuthenticated.and.returnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      staffAuthGuard({} as never, { url: '//evil.example' } as never)
    );

    expect(authStoreMock.waitUntilReady).toHaveBeenCalled();
    expect(router.serializeUrl(result as never)).toBe('/staff/login?reason=auth-required&returnUrl=%2Fstaff');
  });

  it('señala la caducidad por inactividad al redirigir', async () => {
    // enforceInactivityLimit cierra la sesión, así que después no hay usuario.
    authStoreMock.enforceInactivityLimit.and.resolveTo(true);
    authStoreMock.isAuthenticated.and.returnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      staffAuthGuard({} as never, { url: '/staff' } as never)
    );

    expect(router.serializeUrl(result as never))
      .toBe('/staff/login?reason=session-expired&returnUrl=%2Fstaff');
  });
});
