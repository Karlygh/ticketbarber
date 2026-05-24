import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';

interface ActivationFeature {
  title: string;
  description: string;
}

@Component({
  selector: 'app-staff-trial-start-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff-trial-start-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './staff-trial-start-page.component.css'
})
export class StaffTrialStartPageComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly routes = APP_ROUTES;
  readonly activationFeatures: ActivationFeature[] = [
    {
      title: 'Panel de barberia',
      description: 'Controla la jornada, llama al siguiente cliente y organiza la cola sin friccion.'
    },
    {
      title: 'Kiosco para coger turno',
      description: 'Tus clientes dejan su nombre, eligen servicio y entran en la lista en pocos segundos.'
    },
    {
      title: 'Pantalla TV para la cola',
      description: 'Muestra los turnos en directo para que la espera se sienta mas ordenada y profesional.'
    },
    {
      title: 'Gestion de turnos en tiempo real',
      description: 'Todo se sincroniza para que staff, kiosco y pantalla trabajen como un mismo sistema.'
    }
  ];

  continueWithGoogle(): void {
    void this.router.navigateByUrl(this.routes.staff.register);
  }

  viewPlans(): void {
    void this.router.navigateByUrl(this.routes.pricing);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl(this.routes.root);
  }
}

