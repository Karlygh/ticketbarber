import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';
import { TvViewModel } from '../../models/tv-view.model';

@Component({
  selector: 'app-tv-default-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tv-default-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tv-default-view.component.css'
})
export class TvDefaultViewComponent {
  @Input({ required: true }) vm!: TvViewModel;
  @Input() switchingView = false;
  @Output() changeView = new EventEmitter<void>();

  readonly routes = APP_ROUTES;
}
