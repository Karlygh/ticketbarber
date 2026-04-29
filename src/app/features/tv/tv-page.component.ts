import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { QueueRepository } from '../../core/data/queue.repository';
import { TvAuthService } from '../../core/services/tv-auth.service';
import { DEFAULT_QUEUE_SETTINGS, QueueSettings } from '../../core/models/settings.model';
import { Ticket } from '../../core/models/ticket.model';
import { TvQueueRow } from '../../core/stores/queue.store';

@Component({
  selector: 'app-tv-page',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './tv-page.component.html',
  styleUrl: './tv-page.component.css'
})
export class TvPageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(QueueRepository);
  private readonly tvAuthService = inject(TvAuthService);

  readonly now = signal(Date.now());
  private readonly tickets = signal<Ticket[]>([]);
  private readonly settings = signal<QueueSettings>(DEFAULT_QUEUE_SETTINGS);

  readonly currentTicket = computed(() =>
    this.tickets()
      .filter(t => t.status !== 'done')
      .find(t => t.status === 'current') ?? null
  );

  readonly rows = computed(() => this.queueForTv(this.now()));
  readonly upcomingRows = computed(() => this.rows().filter(r => r.ticket.status !== 'current'));

  private readonly subs: Subscription[] = [];
  private readonly clockInterval = window.setInterval(() => this.now.set(Date.now()), 1000);
  private heartbeatInterval?: number;

  ngOnInit(): void {
    const shopIdFromRoute = this.route.snapshot.params['shopId'] as string | undefined;
    const shopIdFromStorage = this.tvAuthService.getShopId();
    const shopId = shopIdFromRoute ?? shopIdFromStorage;

    if (!shopId) {
      void this.router.navigate(['/tv/pair']);
      return;
    }

    if (shopIdFromRoute && !shopIdFromStorage) {
      this.tvAuthService.saveBinding(shopIdFromRoute);
    }

    this.subs.push(
      this.repository.observeTicketsForShop(shopId).subscribe(t => this.tickets.set(t)),
      this.repository.observeSettingsForShop(shopId).subscribe(s => this.settings.set(s))
    );

    const deviceId = this.tvAuthService.getDeviceId();
    this.heartbeatInterval = window.setInterval(
      () => void this.tvAuthService.updateLastSeen(deviceId),
      5 * 60 * 1000
    );
  }

  ngOnDestroy(): void {
    window.clearInterval(this.clockInterval);
    if (this.heartbeatInterval) window.clearInterval(this.heartbeatInterval);
    this.subs.forEach(s => s.unsubscribe());
  }

  formatWait(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const horaLabel = h === 1 ? 'hora' : 'horas';
    return m === 0 ? `${h} ${horaLabel}` : `${h} ${horaLabel} y ${m} min`;
  }

  private queueForTv(nowMs: number): TvQueueRow[] {
    const active = this.tickets()
      .filter(t => t.status !== 'done')
      .sort((a, b) => a.position - b.position || a.createdAtMs - b.createdAtMs);

    if (!active.length) return [];

    const rows: TvQueueRow[] = [];
    let carry = 0;
    active.forEach((ticket, index) => {
      if (index === 0 && ticket.status === 'current') {
        const remaining = this.remainingMin(ticket, nowMs);
        rows.push({ ticket, waitMin: remaining });
        carry = remaining;
        return;
      }
      rows.push({ ticket, waitMin: carry });
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
