import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terminos-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terminos-page.component.html',
  styleUrl: './terminos-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminosPageComponent {}
