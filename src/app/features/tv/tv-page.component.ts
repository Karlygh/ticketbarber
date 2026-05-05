import { CommonModule, DatePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { QueueRepository } from '../../core/data/queue.repository';
import { TvAuthService } from '../../core/services/tv-auth.service';
import { ShopService } from '../../core/services/shop.service';
import { BarberService } from '../../core/services/barber.service';
import { DEFAULT_QUEUE_SETTINGS, QueueSettings } from '../../core/models/settings.model';
import { Ticket } from '../../core/models/ticket.model';
import { BarberProfile } from '../../core/models/barber.model';
import { TvQueueRow } from '../../core/stores/queue.store';

interface BarberTvGroup {
  barber: BarberProfile;
  current: TvQueueRow | null;
  upcomingAll: TvQueueRow[];
  upcomingVisible: TvQueueRow[];
  queueMode: 'two' | 'many';
  autoScrollEnabled: boolean;
}

interface GlobalWaitingRow {
  barberId: string;
  barberName: string;
  row: TvQueueRow;
}

@Component({
  selector: 'app-tv-page',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './tv-page.component.html',
  styleUrl: './tv-page.component.css'
})
export class TvPageComponent implements OnInit, AfterViewInit, OnDestroy {
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

  @ViewChildren('autoScrollList') private readonly autoScrollLists?: QueryList<ElementRef<HTMLElement>>;

  private readonly subs: Subscription[] = [];
  private readonly clockInterval = window.setInterval(() => this.now.set(Date.now()), 1000);
  private heartbeatInterval?: number;
  private autoScrollFrame?: number;
  private lastAutoScrollTs = 0;
  private readonly autoScrollDirection = new WeakMap<HTMLElement, number>();

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
      }
    });

    const deviceId = this.tvAuthService.getDeviceId();
    this.heartbeatInterval = window.setInterval(
      () => void this.tvAuthService.updateLastSeen(deviceId),
      5 * 60 * 1000
    );
  }

  ngAfterViewInit(): void {
    this.startAutoScrollLoop();
    this.subs.push(
      this.autoScrollLists?.changes.subscribe(() => this.resetAutoScrollDirections()) ?? new Subscription()
    );
  }

  ngOnDestroy(): void {
    window.clearInterval(this.clockInterval);
    if (this.heartbeatInterval) window.clearInterval(this.heartbeatInterval);
    if (this.autoScrollFrame) window.cancelAnimationFrame(this.autoScrollFrame);
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

  private buildGroups(nowMs: number): BarberTvGroup[] {
    return this.activeBarbers().slice(0, 4).map((barber) => {
      const rows = this.queueForBarber(barber.id, nowMs);
      const current = rows.find((row) => row.ticket.status === 'current') ?? null;
      const upcomingAll = rows.filter((row) => row.ticket.status !== 'current');
      const queueMode = this.resolveQueueMode(upcomingAll.length);
      const visibleCount = queueMode === 'two' ? 2 : 5;
      return {
        barber,
        current,
        upcomingAll,
        upcomingVisible: upcomingAll.slice(0, visibleCount),
        queueMode,
        autoScrollEnabled: queueMode === 'many' && upcomingAll.length > 6
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
      rows: group.upcomingAll.slice(group.upcomingVisible.length)
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

  private resolveQueueMode(upcomingCount: number): 'two' | 'many' {
    if (upcomingCount >= 3) return 'many';
    return 'two';
  }

  private startAutoScrollLoop(): void {
    const tick = (ts: number) => {
      const deltaMs = this.lastAutoScrollTs ? ts - this.lastAutoScrollTs : 16;
      this.lastAutoScrollTs = ts;
      this.animateAutoScroll(deltaMs);
      this.autoScrollFrame = window.requestAnimationFrame(tick);
    };
    this.autoScrollFrame = window.requestAnimationFrame(tick);
  }

  private animateAutoScroll(deltaMs: number): void {
    const list = this.autoScrollLists?.toArray() ?? [];
    const speedPxPerMs = 0.018;

    for (const elRef of list) {
      const el = elRef.nativeElement;
      const enabled = el.dataset['scrollEnabled'] === 'true';
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      if (!enabled || maxScroll <= 0) {
        el.scrollTop = 0;
        this.autoScrollDirection.set(el, 1);
        continue;
      }

      let direction = this.autoScrollDirection.get(el) ?? 1;
      const nextScrollTop = el.scrollTop + direction * deltaMs * speedPxPerMs;
      if (nextScrollTop <= 0) {
        el.scrollTop = 0;
        direction = 1;
      } else if (nextScrollTop >= maxScroll) {
        el.scrollTop = maxScroll;
        direction = -1;
      } else {
        el.scrollTop = nextScrollTop;
      }
      this.autoScrollDirection.set(el, direction);
    }
  }

  private resetAutoScrollDirections(): void {
    for (const elRef of this.autoScrollLists?.toArray() ?? []) {
      this.autoScrollDirection.set(elRef.nativeElement, 1);
    }
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
