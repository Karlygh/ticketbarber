import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { QueueRepository } from '../../core/data/queue.repository';
import { BarberService } from '../../core/services/barber.service';
import { ShopService } from '../../core/services/shop.service';
import { TvAuthService } from '../../core/services/tv-auth.service';
import { DEFAULT_QUEUE_SETTINGS } from '../../core/models/settings.model';
import { TvPageService } from './tv-page.service';

describe('TvPageService', () => {
  let service: TvPageService;

  const settings$ = new BehaviorSubject<import('../../core/models/settings.model').QueueSettings>({ ...DEFAULT_QUEUE_SETTINGS, tvView: 'default' });
  const tickets$ = new BehaviorSubject<never[]>([]);
  const barbers$ = new BehaviorSubject<never[]>([]);

  const repositoryMock = {
    observeTicketsForShop: jasmine.createSpy('observeTicketsForShop').and.returnValue(tickets$.asObservable()),
    observeSettingsForShop: jasmine.createSpy('observeSettingsForShop').and.returnValue(settings$.asObservable()),
    updateTvViewForShop: jasmine.createSpy('updateTvViewForShop').and.resolveTo()
  };

  const barberServiceMock = {
    observeBarbersForShop: jasmine.createSpy('observeBarbersForShop').and.returnValue(barbers$.asObservable())
  };

  const shopServiceMock = {
    getShopProfile: jasmine.createSpy('getShopProfile').and.resolveTo(null)
  };

  const tvAuthServiceMock = {
    getDeviceId: jasmine.createSpy('getDeviceId').and.returnValue('device-1'),
    updateLastSeen: jasmine.createSpy('updateLastSeen').and.resolveTo()
  };

  beforeEach(() => {
    jasmine.clock().install();
    repositoryMock.updateTvViewForShop.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        TvPageService,
        { provide: QueueRepository, useValue: repositoryMock },
        { provide: BarberService, useValue: barberServiceMock },
        { provide: ShopService, useValue: shopServiceMock },
        { provide: TvAuthService, useValue: tvAuthServiceMock }
      ]
    });
    service = TestBed.inject(TvPageService);
  });

  afterEach(() => {
    service.destroy();
    jasmine.clock().uninstall();
  });

  it('cycleView advances from default to view-3', async () => {
    settings$.next({ ...DEFAULT_QUEUE_SETTINGS, tvView: 'default' });
    service.init('shop-1');

    await service.cycleView();

    expect(repositoryMock.updateTvViewForShop).toHaveBeenCalledWith('shop-1', 'view-3');
  });

  it('cycleView advances from view-3 to rose-soft', async () => {
    settings$.next({ ...DEFAULT_QUEUE_SETTINGS, tvView: 'view-3' });
    service.init('shop-1');

    await service.cycleView();

    expect(repositoryMock.updateTvViewForShop).toHaveBeenCalledWith('shop-1', 'rose-soft');
  });

  it('cycleView advances from rose-soft to cards-light (wraps around)', async () => {
    settings$.next({ ...DEFAULT_QUEUE_SETTINGS, tvView: 'rose-soft' });
    service.init('shop-1');

    await service.cycleView();

    expect(repositoryMock.updateTvViewForShop).toHaveBeenCalledWith('shop-1', 'cards-light');
  });

  it('cycleView advances from cards-light to default', async () => {
    settings$.next({ ...DEFAULT_QUEUE_SETTINGS, tvView: 'cards-light' });
    service.init('shop-1');

    await service.cycleView();

    expect(repositoryMock.updateTvViewForShop).toHaveBeenCalledWith('shop-1', 'default');
  });

  it('cycleView is a no-op when shopId is not set', async () => {
    await service.cycleView();
    expect(repositoryMock.updateTvViewForShop).not.toHaveBeenCalled();
  });

  it('cycleView is a no-op when already switching', async () => {
    service.init('shop-1');
    service.switchingView.set(true);

    await service.cycleView();

    expect(repositoryMock.updateTvViewForShop).not.toHaveBeenCalled();
  });

  it('sets shopId on init', () => {
    service.init('shop-abc');
    expect(service.shopId()).toBe('shop-abc');
  });
});
