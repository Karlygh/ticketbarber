import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QueueStore } from '../../core/stores/queue.store';

@Component({
  selector: 'app-tv-page',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './tv-page.component.html',
  styleUrl: './tv-page.component.css'
})
export class TvPageComponent implements OnDestroy {
  readonly queueStore = inject(QueueStore);
  readonly now = signal(Date.now());
  readonly rows = computed(() => this.queueStore.queueForTv(this.now()));
  readonly upcomingRows = computed(() => this.rows().filter(r => r.ticket.status !== 'current'));
  private readonly clockInterval = window.setInterval(() => this.now.set(Date.now()), 1000);

  formatWait(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const horaLabel = h === 1 ? 'hora' : 'horas';
    return m === 0 ? `${h} ${horaLabel}` : `${h} ${horaLabel} y ${m} min`;
  }

  ngOnDestroy(): void {
    window.clearInterval(this.clockInterval);
  }
}
