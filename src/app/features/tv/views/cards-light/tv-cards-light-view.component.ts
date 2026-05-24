import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';
import { TvBarberGroupViewModel, TvViewModel } from '../../models/tv-view.model';

@Component({
  selector: 'app-tv-cards-light-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tv-cards-light-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tv-cards-light-view.component.css'
})
export class TvCardsLightViewComponent {
  @Input({ required: true }) vm!: TvViewModel;
  @Input() switchingView = false;
  @Output() changeView = new EventEmitter<void>();

  readonly routes = APP_ROUTES;

  cardClass(groupCount: number): string {
    return `grid-${Math.min(Math.max(groupCount, 1), 4)}`;
  }

  statusClass(group: TvBarberGroupViewModel): string {
    return group.current || group.upcomingAll.length ? 'is-busy' : 'is-idle';
  }
}
