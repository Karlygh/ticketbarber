import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TvViewModel } from './tv-view.model';

@Component({
  selector: 'app-tv-placeholder-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tv-placeholder-view.component.html',
  styleUrl: './tv-placeholder-view.component.css'
})
export class TvPlaceholderViewComponent {
  @Input({ required: true }) vm!: TvViewModel;
  @Input() switchingView = false;
  @Output() changeView = new EventEmitter<void>();
}
