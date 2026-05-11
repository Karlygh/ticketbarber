import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-cookies-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './cookies-page.component.html',
  styleUrl: './cookies-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookiesPageComponent {
  readonly currentYear = new Date().getFullYear();
}
