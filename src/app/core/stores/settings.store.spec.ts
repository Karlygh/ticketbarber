import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { QueueRepository } from '../data/queue.repository';
import { QueueSettings } from '../models/settings.model';
import { SettingsStore } from './settings.store';

describe('SettingsStore', () => {
  let store: SettingsStore;
  const settings$ = new BehaviorSubject<QueueSettings>({
    isOpen: true,
    updatedAtMs: 1000,
    activeBarberIds: ['b1'],
    barberStates: {},
    tvView: 'cards-light'
  });

  const repositoryMock = {
    observeSettings: jasmine.createSpy('observeSettings').and.returnValue(settings$.asObservable()),
    bootstrapDefaults: jasmine.createSpy('bootstrapDefaults').and.resolveTo(),
    closeDay: jasmine.createSpy('closeDay').and.resolveTo(),
    openDay: jasmine.createSpy('openDay').and.resolveTo()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SettingsStore,
        { provide: QueueRepository, useValue: repositoryMock }
      ]
    });
    store = TestBed.inject(SettingsStore);
    repositoryMock.bootstrapDefaults.calls.reset();
    repositoryMock.closeDay.calls.reset();
    repositoryMock.openDay.calls.reset();
  });

  it('reads isOpen from observed settings', () => {
    expect(store.isOpen()).toBeTrue();
    settings$.next({ ...settings$.value, isOpen: false });
    expect(store.isOpen()).toBeFalse();
  });

  it('bootstraps defaults only once', async () => {
    await store.bootstrap();
    await store.bootstrap();
    expect(repositoryMock.bootstrapDefaults).toHaveBeenCalledTimes(1);
  });

  it('delegates open/close day actions', async () => {
    await store.closeDay();
    await store.openDay(['b1', 'b2']);

    expect(repositoryMock.closeDay).toHaveBeenCalled();
    expect(repositoryMock.openDay).toHaveBeenCalledWith(['b1', 'b2']);
  });
});
