import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-subscription-cancel-page',
  standalone: true,
  imports: [HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-header></app-header>
    <div class="result-page cancel">
      <div class="icon">😕</div>
      <h1>Pago cancelado</h1>
      <p>No se ha realizado ningún cargo. Puedes intentarlo de nuevo cuando quieras.</p>
      <div class="actions">
        <button class="btn-primary" (click)="tryAgain()">Volver a los planes</button>
        <button class="btn-secondary" (click)="goHome()">Ir al inicio</button>
      </div>
    </div>
  `,
  styleUrl: './subscription-cancel-page.component.css'
})
export class SubscriptionCancelPageComponent {
  private readonly router = inject(Router);

  tryAgain(): void { void this.router.navigateByUrl('/pricing'); }
  goHome(): void { void this.router.navigateByUrl('/'); }
}
