import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-privacidad-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './privacidad-page.component.html',
  styleUrl: './privacidad-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacidadPageComponent {
  readonly currentYear = new Date().getFullYear();
}
