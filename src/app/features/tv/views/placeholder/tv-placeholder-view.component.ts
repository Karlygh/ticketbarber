import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';
import { TvBarberGroupViewModel, TvViewModel } from '../../models/tv-view.model';

@Component({
  selector: 'app-tv-placeholder-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tv-placeholder-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tv-placeholder-view.component.css'
})
export class TvPlaceholderViewComponent {
  @Input({ required: true }) vm!: TvViewModel;
  @Input() switchingView = false;
  @Output() changeView = new EventEmitter<void>();

  readonly routes = APP_ROUTES;

  cardClass(groupCount: number): string {
    return `grid-${Math.min(Math.max(groupCount, 1), 4)}`;
  }

  statusClass(group: TvBarberGroupViewModel): string {
    if (group.isOnBreak) return 'is-break';
    return group.current || group.upcomingAll.length ? 'is-live' : 'is-idle';
  }
}
