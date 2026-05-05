import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
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
import { formatOpeningHoursForToday } from '../../core/utils/opening-hours.util';

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
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './tv-page.component.html',
  styleUrl: './tv-page.component.css'
})
export class TvPageComponent implements OnInit, OnDestroy {
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
