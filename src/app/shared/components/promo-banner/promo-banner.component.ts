import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Mensajes que rotan en la banda. Edita aquí el texto de la oferta. */
const PROMO_MESSAGES: readonly string[] = [
  '🔥 OFERTA: suscripción a solo 7,98 €/mes',
  '✂️ Prueba 7 días gratis · Sin tarjeta de crédito',
  '⚡ Gestiona los turnos de tu barbería desde 7,98 €/mes',
];

/** Ruta a la que lleva la banda al pulsarla. */
const PROMO_LINK = '/pricing';

/**
 * PromoBannerComponent — banda de oferta en movimiento (marquee).
 * Para cambiar el mensaje o el enlace, modifica las constantes de arriba.
 */
@Component({
  selector: 'app-promo-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './promo-banner.component.html',
  styleUrl: './promo-banner.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoBannerComponent {
  readonly messages = PROMO_MESSAGES;
  readonly link = PROMO_LINK;
  /** Dos copias del listado para que el bucle sea continuo (-50% = una copia). */
  readonly copies = [0, 1];
}
