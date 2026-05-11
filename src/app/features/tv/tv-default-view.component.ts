import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TvViewModel } from './tv-view.model';

@Component({
  selector: 'app-tv-default-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tv-default-view.component.html',
  styleUrl: './tv-default-view.component.css'
})
export class TvDefaultViewComponent {
  @Input({ required: true }) vm!: TvViewModel;
  @Input() switchingView = false;
  @Output() changeView = new EventEmitter<void>();
}
