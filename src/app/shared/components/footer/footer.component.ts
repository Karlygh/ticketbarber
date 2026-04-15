import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * FooterComponent — componente standalone reutilizable.
 * Acepta `currentYear` como @Input para que cualquier página lo controle.
 * Usa OnPush ya que sólo depende de sus inputs (sin subscripciones internas).
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  /** Año que se muestra en el copyright. Por defecto el año en curso. */
  @Input() currentYear: number = new Date().getFullYear();
}
