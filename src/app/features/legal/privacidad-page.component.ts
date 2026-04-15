import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacidad-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacidad-page.component.html',
  styleUrl: './privacidad-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacidadPageComponent {}
