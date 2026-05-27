import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';
import { TvBarberGroupViewModel, TvViewModel } from '../../models/tv-view.model';

@Component({
  selector: 'app-tv-rose-soft-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tv-rose-soft-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tv-rose-soft-view.component.css'
})
export class TvRoseSoftViewComponent {
  @Input({ required: true }) vm!: TvViewModel;
  @Input() switchingView = false;
  @Output() changeView = new EventEmitter<void>();

  readonly routes = APP_ROUTES;

  featuredGroup(): TvBarberGroupViewModel | null {
    return this.vm.groups.find((group) => group.current) ?? this.vm.groups[0] ?? null;
  }

  cardClass(groupCount: number): string {
    return `count-${Math.min(Math.max(groupCount, 1), 4)}`;
  }
}
