import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { QueueRepository } from '../../core/data/queue.repository';
import { OpeningHoursDay } from '../../core/models/shop.model';
import { TvAuthService } from '../../core/services/tv-auth.service';
import { ShopService } from '../../core/services/shop.service';
import { BarberService } from '../../core/services/barber.service';
import { DEFAULT_QUEUE_SETTINGS, QueueSettings } from '../../core/models/settings.model';
import { Ticket } from '../../core/models/ticket.model';
import { BarberProfile } from '../../core/models/barber.model';
import { TvQueueRow } from '../../core/stores/queue.store';
import { formatOpeningHoursForToday } from '../../core/utils/opening-hours.util';
import { TvCardsLightViewComponent } from './tv-cards-light-view.component';
import { TvDefaultViewComponent } from './tv-default-view.component';
import {
  TvBarberGroupViewModel,
  TvGlobalWaitingRowViewModel,
  TvUpcomingTicketViewModel,
  TvViewId,
  TvViewModel
} from './tv-view.model';
import { TvPlaceholderViewComponent } from './tv-placeholder-view.component';

interface BarberTvGroup {
  barber: BarberProfile;
  current: TvQueueRow | null;
  upcomingAll: TvQueueRow[];
  upcomingVisible: TvQueueRow[];
}

interface GlobalWaitingRow {
  barberId: string;
  barberName: string;
  row: TvQueueRow;
}

@Component({
  selector: 'app-tv-page',
  standalone: true,
  imports: [CommonModule, TvDefaultViewComponent, TvCardsLightViewComponent, TvPlaceholderViewComponent],
  templateUrl: './tv-page.component.html',
  styleUrl: './tv-page.component.css'
})
export class TvPageComponent implements OnInit, OnDestroy {
  private readonly viewOrder: TvViewId[] = ['cards-light', 'default', 'view-3'];
  private readonly barberColors = ['#22d3ee', '#fb7185', '#f59e0b', '#a78bfa', '#34d399', '#60a5fa'];
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(QueueRepository);
  private readonly tvAuthService = inject(TvAuthService);
  private readonly shopService = inject(ShopService);
  private readonly barberService = inject(BarberService);

  readonly now = signal(Date.now());
  readonly shopName = signal<string>('');
  readonly shopLogoUrl = signal<string>('');
  readonly shopAddress = signal<string>('');
  readonly shopPhone = signal<string>('');
  readonly todayHours = signal<string>('Cerrado');
  readonly openingHours = signal<OpeningHoursDay[]>([]);
  readonly shopId = signal<string | null>(null);
  readonly switchingView = signal(false);
  private readonly tickets = signal<Ticket[]>([]);
  private readonly settings = signal<QueueSettings>(DEFAULT_QUEUE_SETTINGS);
  private readonly barbers = signal<BarberProfile[]>([]);

  readonly activeBarbers = computed(() =>
    this.barbers().filter((barber) => this.settings().activeBarberIds.includes(barber.id))
  );
  readonly layoutClass = computed(() => `count-${Math.min(Math.max(this.activeBarbers().length, 1), 4)}`);
  readonly densityMode = computed(() => (this.activeBarbers().length >= 4 ? 'dense' : 'regular'));
  readonly singleBarberMode = computed(() => this.activeBarbers().length <= 1);
  readonly groups = computed(() => this.buildGroups(this.now()));
  readonly globalWaitingRows = computed(() => this.buildGlobalWaitingRows(this.groups()));
  readonly activeView = computed<TvViewId>(() => this.settings().tvView ?? 'default');
  readonly viewModel = computed<TvViewModel>(() => this.buildViewModel());

  private readonly subs: Subscription[] = [];
  private readonly clockInterval = window.setInterval(() => this.now.set(Date.now()), 1000);
  private heartbeatInterval?: number;

  async ngOnInit(): Promise<void> {
    const shopIdFromRoute = this.route.snapshot.params['shopId'] as string | undefined;
    const shopIdFromStorage = this.tvAuthService.getShopId();
    const shopId = shopIdFromRoute ?? shopIdFromStorage;

    if (!shopId) {
      void this.router.navigate(['/activate']);
      return;
    }

    if (shopIdFromRoute && !shopIdFromStorage) {
      this.tvAuthService.saveBinding(shopIdFromRoute);
    }

    this.shopId.set(shopId);

    this.subs.push(
      this.repository.observeTicketsForShop(shopId).subscribe((t) => this.tickets.set(t)),
      this.repository.observeSettingsForShop(shopId).subscribe((s) => this.settings.set(s)),
      this.barberService.observeBarbersForShop(shopId).subscribe((barbers) => this.barbers.set(barbers))
    );

    void this.shopService.getShopProfile(shopId).then(profile => {
      if (profile) {
        this.shopName.set(profile.shopName || '');
        this.shopLogoUrl.set(profile.logoUrl || '');
        this.shopAddress.set(profile.address || '');
        this.shopPhone.set(profile.phone || '');
        this.openingHours.set(profile.openingHours);
        this.todayHours.set(formatOpeningHoursForToday(profile.openingHours, new Date(), 'Europe/Madrid'));
      }
    });

    const deviceId = this.tvAuthService.getDeviceId();
    this.heartbeatInterval = window.setInterval(
      () => void this.tvAuthService.updateLastSeen(deviceId),
      5 * 60 * 1000
    );
  }

  ngOnDestroy(): void {
    window.clearInterval(this.clockInterval);
    if (this.heartbeatInterval) window.clearInterval(this.heartbeatInterval);
    this.subs.forEach((s) => s.unsubscribe());
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  formatWait(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const horaLabel = h === 1 ? 'hora' : 'horas';
    return m === 0 ? `${h} ${horaLabel}` : `${h} ${horaLabel} y ${m} min`;
  }

  formatApproxTime(timestampMs: number): string {
    const formatter = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(new Date(timestampMs));
  }

  capitalizeFirst(value: string | null | undefined): string {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed[0].toUpperCase() + trimmed.slice(1);
  }

  async cycleView(): Promise<void> {
    const shopId = this.shopId();
    if (!shopId || this.switchingView()) {
      return;
    }

    const currentView = this.activeView();
    const currentIndex = this.viewOrder.indexOf(currentView);
    const nextView = this.viewOrder[(currentIndex + 1) % this.viewOrder.length] ?? this.viewOrder[0];
    this.switchingView.set(true);
    try {
      await this.repository.updateTvViewForShop(shopId, nextView);
    } finally {
      this.switchingView.set(false);
    }
  }

  private buildGroups(nowMs: number): BarberTvGroup[] {
    return this.activeBarbers().slice(0, 4).map((barber) => {
      const rows = this.queueForBarber(barber.id, nowMs);
      const current = rows.find((row) => row.ticket.status === 'current') ?? null;
      const upcomingAll = rows.filter((row) => row.ticket.status !== 'current');
      const visibleCount = Math.min(upcomingAll.length, 2);
      return {
        barber,
        current,
        upcomingAll,
        upcomingVisible: upcomingAll.slice(0, visibleCount)
      };
    });
  }

  barberAccent(barberId: string): string {
    let hash = 0;
    for (let i = 0; i < barberId.length; i += 1) {
      hash = (hash << 5) - hash + barberId.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % this.barberColors.length;
    return this.barberColors[idx];
  }

  private buildGlobalWaitingRows(groups: BarberTvGroup[]): GlobalWaitingRow[] {
    const rowsByBarber = groups.map((group) => ({
      barberId: group.barber.id,
      barberName: group.barber.name,
      rows: group.upcomingAll.slice(2)
    }));

    const result: GlobalWaitingRow[] = [];
    let index = 0;
    while (rowsByBarber.some((entry) => index < entry.rows.length)) {
      for (const entry of rowsByBarber) {
        if (index < entry.rows.length) {
          result.push({
            barberId: entry.barberId,
            barberName: entry.barberName,
            row: entry.rows[index]
          });
        }
      }
      index += 1;
    }
    return result;
  }

  private buildViewModel(): TvViewModel {
    const groups = this.groups().map((group) => this.toGroupViewModel(group));
    const groupsMap = new Map(groups.map((group) => [group.barber.id, group]));
    const globalWaitingRows = this.globalWaitingRows().map<TvGlobalWaitingRowViewModel>((item) => ({
      barberId: item.barberId,
      barberName: item.barberName,
      accentColor: groupsMap.get(item.barberId)?.accentColor ?? this.barberAccent(item.barberId),
      row: this.toUpcomingRowViewModel(item.row)
    }));

    return {
      activeView: this.activeView(),
      densityMode: this.densityMode(),
      layoutClass: this.layoutClass(),
      singleBarberMode: this.singleBarberMode(),
      groups,
      globalWaitingRows,
      shop: {
        name: this.shopName(),
        logoUrl: this.shopLogoUrl(),
        address: this.shopAddress(),
        phone: this.shopPhone(),
        todayHours: this.todayHours(),
        elapsedLabel: this.formatElapsedSinceOpening(this.now())
      },
      clockLabel: this.formatClock(this.now())
    };
  }

  private toGroupViewModel(group: BarberTvGroup): TvBarberGroupViewModel {
    return {
      barber: group.barber,
      accentColor: this.barberAccent(group.barber.id),
      initials: this.initials(group.barber.name),
      current: group.current
        ? {
            row: group.current,
            displayName: this.capitalizeFirst(group.current.ticket.displayName),
            serviceName: group.current.ticket.serviceNameSnapshot,
            waitLabel: this.formatWait(group.current.waitMin)
          }
        : null,
      upcomingAll: group.upcomingAll.map((row) => this.toUpcomingRowViewModel(row)),
      upcomingVisible: group.upcomingVisible.map((row) => this.toUpcomingRowViewModel(row))
    };
  }

  private toUpcomingRowViewModel(row: TvQueueRow): TvUpcomingTicketViewModel {
    return {
      row,
      displayName: this.capitalizeFirst(row.ticket.displayName),
      serviceName: row.ticket.serviceNameSnapshot,
      waitLabel: this.formatWait(row.waitMin),
      etaLabel: this.formatApproxTime(row.etaAtMs)
    };
  }

  private formatClock(nowMs: number): string {
    const formatter = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatter.format(new Date(nowMs));
  }

  private formatElapsedSinceOpening(nowMs: number): string {
    const openingStartMs = this.todayOpeningStartMs(nowMs);
    if (openingStartMs === null || nowMs <= openingStartMs) {
      return '00:00:00';
    }

    const diffSeconds = Math.floor((nowMs - openingStartMs) / 1000);
    const hours = Math.floor(diffSeconds / 3600)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((diffSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(diffSeconds % 60)
      .toString()
      .padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private todayOpeningStartMs(nowMs: number): number | null {
    const days = this.openingHours();
    if (!days.length) {
      return null;
    }

    const weekday = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      weekday: 'short'
    }).format(new Date(nowMs));
    const dayMap: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6
    };
    const dayIndex = dayMap[weekday] ?? 0;
    const day = days[dayIndex];
    if (!day || day.closed || day.slots.length === 0) {
      return null;
    }

    const firstSlot = day.slots[0];
    const [hours, minutes] = firstSlot.opens.split(':').map(Number);
    const now = new Date(nowMs);
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      Number.isFinite(hours) ? hours : 0,
      Number.isFinite(minutes) ? minutes : 0,
      0,
      0
    ).getTime();
  }

  private queueForBarber(barberId: string, nowMs: number): TvQueueRow[] {
    const active = this.tickets()
      .filter((t) => t.barberId === barberId && t.status !== 'done')
      .sort((a, b) => a.position - b.position || a.createdAtMs - b.createdAtMs);

    if (!active.length) return [];

    const rows: TvQueueRow[] = [];
    let carry = 0;
    active.forEach((ticket, index) => {
      if (index === 0 && ticket.status === 'current') {
        const remaining = this.remainingMin(ticket, nowMs);
        const etaAtMs = nowMs + remaining * 60000;
        rows.push({ ticket, waitMin: remaining, etaAtMs });
        carry = remaining;
        return;
      }
      const etaAtMs = nowMs + carry * 60000;
      rows.push({ ticket, waitMin: carry, etaAtMs });
      carry += ticket.estimatedDurationMin;
    });
    return rows;
  }

  private remainingMin(ticket: Ticket, nowMs: number): number {
    if (!ticket.startedAtMs) return ticket.estimatedDurationMin;
    const elapsed = (nowMs - ticket.startedAtMs) / 60000;
    return Math.max(0, Math.ceil(ticket.estimatedDurationMin - elapsed));
  }
}
