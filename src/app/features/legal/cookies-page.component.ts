import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cookies-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cookies-page.component.html',
  styleUrl: './cookies-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookiesPageComponent {}
