import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TvBarberGroupViewModel, TvViewModel } from './tv-view.model';

@Component({
  selector: 'app-tv-cards-light-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tv-cards-light-view.component.html',
  styleUrl: './tv-cards-light-view.component.css'
})
export class TvCardsLightViewComponent {
  @Input({ required: true }) vm!: TvViewModel;
  @Input() switchingView = false;
  @Output() changeView = new EventEmitter<void>();

  cardClass(groupCount: number): string {
    return `grid-${Math.min(Math.max(groupCount, 1), 4)}`;
  }

  statusClass(group: TvBarberGroupViewModel): string {
    return group.current || group.upcomingAll.length ? 'is-busy' : 'is-idle';
  }
}
