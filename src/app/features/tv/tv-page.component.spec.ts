jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TvPageComponent } from './tv-page.component';
import { TvAuthService } from '../../core/services/tv-auth.service';
import { TvPageService } from './tv-page.service';

const validateBindingMock = jest.fn();
const serviceInitMock = jest.fn();
const serviceDestroyMock = jest.fn();

const mockTvAuthService = { validateBinding: validateBindingMock };
const mockTvPageService = {
  init: serviceInitMock,
  destroy: serviceDestroyMock,
  displayMode: signal('placeholder' as any),
  settings: signal<any>({ isOpen: false }),
  barbers: signal<any[]>([]),
  tickets: signal<any[]>([])
};

const mockRoute = {
  snapshot: { params: {} }
};

describe('TvPageComponent', () => {
  let component: TvPageComponent;

  function configure(routeParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [TvPageComponent],
      providers: [
        provideRouter([]),
        { provide: TvAuthService, useValue: mockTvAuthService },
        { provide: ActivatedRoute, useValue: { snapshot: { params: routeParams } } }
      ]
    });
    // TvPageComponent declares TvPageService in its own providers array,
    // so we must override at the component level to inject the mock.
    TestBed.overrideComponent(TvPageComponent, {
      set: { providers: [{ provide: TvPageService, useValue: mockTvPageService }] }
    });
    const fixture = TestBed.createComponent(TvPageComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('ngOnInit', () => {
    it('calls service.init with shopId when binding is valid', async () => {
      configure();
      validateBindingMock.mockResolvedValue({ valid: true, shopId: 'shop-1' });
      await component.ngOnInit();
      expect(serviceInitMock).toHaveBeenCalledWith('shop-1', expect.any(Function));
    });

    it('redirects to /activate when binding is invalid', async () => {
      configure();
      const router = TestBed.inject(Router);
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      validateBindingMock.mockResolvedValue({ valid: false, reason: 'missing' });
      await component.ngOnInit();
      expect(navigateSpy).toHaveBeenCalledWith(['/activate'], expect.objectContaining({ queryParams: { reason: 'missing' } }));
      expect(serviceInitMock).not.toHaveBeenCalled();
    });

    it('redirects to /tv when routeShopId does not match binding shopId', async () => {
      configure({ shopId: 'other-shop' });
      const router = TestBed.inject(Router);
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      validateBindingMock.mockResolvedValue({ valid: true, shopId: 'shop-1' });
      await component.ngOnInit();
      expect(navigateSpy).toHaveBeenCalledWith(['/tv']);
      expect(serviceInitMock).not.toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('calls service.destroy', () => {
      configure();
      component.ngOnDestroy();
      expect(serviceDestroyMock).toHaveBeenCalled();
    });
  });
});
