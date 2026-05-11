import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-terminos-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './terminos-page.component.html',
  styleUrl: './terminos-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminosPageComponent {
  readonly currentYear = new Date().getFullYear();
}
