import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-aviso-legal-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './aviso-legal-page.component.html',
  styleUrl: './cookies-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvisoLegalPageComponent {
  readonly currentYear = new Date().getFullYear();
}
