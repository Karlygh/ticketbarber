import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QueueRepository } from '../../core/data/queue.repository';
import { BarberService } from '../../core/services/barber.service';
import { ShopService } from '../../core/services/shop.service';
import { TvAuthService, TvBindingFailureReason } from '../../core/services/tv-auth.service';
import { BarberProfile } from '../../core/models/barber.model';
import { OpeningHoursDay } from '../../core/models/shop.model';
import { Ticket } from '../../core/models/ticket.model';
import { DEFAULT_QUEUE_SETTINGS, QueueSettings } from '../../core/models/settings.model';
import { formatOpeningHoursForToday } from '../../core/utils/opening-hours.util';
import { TvViewId, TvViewModel } from './models/tv-view.model';
import { buildTvViewModel } from './utils/tv-view-builder.util';

@Injectable()
export class TvPageService {
  private readonly repository = inject(QueueRepository);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tvAuthService = inject(TvAuthService);
  private readonly shopService = inject(ShopService);
  private readonly barberService = inject(BarberService);

  private readonly viewOrder: TvViewId[] = ['cards-light', 'default', 'view-3', 'rose-soft'];
  private readonly viewStoragePrefix = 'ticketbarber:tv:view:';

  readonly shopId = signal<string | null>(null);
  readonly switchingView = signal(false);
  private readonly selectedView = signal<TvViewId | null>(null);

  private readonly now = signal(Date.now());
  private readonly shopName = signal<string>('');
  private readonly shopLogoUrl = signal<string>('');
  private readonly shopAddress = signal<string>('');
  private readonly shopPhone = signal<string>('');
  private readonly todayHours = signal<string>('Cerrado');
  private readonly openingHours = signal<OpeningHoursDay[]>([]);
  private readonly tickets = signal<Ticket[]>([]);
  private readonly settings = signal<QueueSettings>(DEFAULT_QUEUE_SETTINGS);
  private readonly barbers = signal<BarberProfile[]>([]);

  private readonly activeBarbers = computed(() =>
    this.barbers().filter((barber) => this.settings().activeBarberIds.includes(barber.id))
  );

  private readonly activeView = computed<TvViewId>(() => this.selectedView() ?? this.settings().tvView ?? 'default');

  readonly viewModel = computed<TvViewModel>(() =>
    buildTvViewModel({
      activeBarbers: this.activeBarbers(),
      tickets: this.tickets(),
      nowMs: this.now(),
      activeView: this.activeView(),
      shop: {
        name: this.shopName(),
        logoUrl: this.shopLogoUrl(),
        address: this.shopAddress(),
        phone: this.shopPhone(),
        todayHours: this.todayHours(),
        openingHours: this.openingHours()
      }
    })
  );

  private clockInterval?: number;
  private heartbeatInterval?: number;
  private bindingCheckInterval?: number;
  private onBindingInvalid?: (reason: TvBindingFailureReason) => void;
  private bindingInvalidNotified = false;

  init(shopId: string, onBindingInvalid?: (reason: TvBindingFailureReason) => void): void {
    this.shopId.set(shopId);
    this.selectedView.set(this.readStoredView(shopId));
    this.onBindingInvalid = onBindingInvalid;
    this.bindingInvalidNotified = false;

    this.repository.observeTicketsForShop(shopId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((t) => this.tickets.set(t));

    this.repository.observeSettingsForShop(shopId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((s) => this.settings.set(s));

    this.barberService.observeBarbersForShop(shopId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((barbers) => this.barbers.set(barbers));

    void this.shopService.getShopProfile(shopId).then((profile) => {
      if (profile) {
        this.shopName.set(profile.shopName || '');
        this.shopLogoUrl.set(profile.logoUrl || '');
        this.shopAddress.set(profile.address || '');
        this.shopPhone.set(profile.phone || '');
        this.openingHours.set(profile.openingHours);
        this.todayHours.set(formatOpeningHoursForToday(profile.openingHours, new Date(), 'Europe/Madrid'));
      }
    });

    this.clockInterval = window.setInterval(() => this.now.set(Date.now()), 1000);

    const deviceId = this.tvAuthService.getDeviceId();
    this.heartbeatInterval = window.setInterval(
      () => void this.tvAuthService.updateLastSeen(deviceId),
      5 * 60 * 1000
    );

    this.bindingCheckInterval = window.setInterval(
      () => void this.verifyBinding(),
      60 * 1000
    );
  }

  async cycleView(): Promise<void> {
    const shopId = this.shopId();
    if (!shopId || this.switchingView()) return;

    const currentView = this.activeView();
    const currentIndex = this.viewOrder.indexOf(currentView);
    const nextView = this.viewOrder[(currentIndex + 1) % this.viewOrder.length] ?? this.viewOrder[0];

    this.switchingView.set(true);
    this.selectedView.set(nextView);
    this.storeView(shopId, nextView);
    try {
      await this.repository.updateTvViewForShop(shopId, nextView);
    } catch {
      // The TV route can be unauthenticated and read-only for settings writes.
      // We keep the selected view locally so UX does not revert.
    } finally {
      this.switchingView.set(false);
    }
  }

  destroy(): void {
    if (this.clockInterval) window.clearInterval(this.clockInterval);
    if (this.heartbeatInterval) window.clearInterval(this.heartbeatInterval);
    if (this.bindingCheckInterval) window.clearInterval(this.bindingCheckInterval);
  }

  private async verifyBinding(): Promise<void> {
    if (this.bindingInvalidNotified) return;
    const result = await this.tvAuthService.validateBinding();
    if (result.valid) return;

    this.bindingInvalidNotified = true;
    this.onBindingInvalid?.(result.reason ?? 'missing');
  }

  private storageKey(shopId: string): string {
    return `${this.viewStoragePrefix}${shopId}`;
  }

  private readStoredView(shopId: string): TvViewId | null {
    try {
      const raw = window.localStorage.getItem(this.storageKey(shopId));
      return this.isTvViewId(raw) ? raw : null;
    } catch {
      return null;
    }
  }

  private storeView(shopId: string, view: TvViewId): void {
    try {
      window.localStorage.setItem(this.storageKey(shopId), view);
    } catch {
      // Ignore storage failures and keep runtime selection.
    }
  }

  private isTvViewId(value: string | null): value is TvViewId {
    return value === 'default' || value === 'cards-light' || value === 'view-3' || value === 'rose-soft';
  }
}
