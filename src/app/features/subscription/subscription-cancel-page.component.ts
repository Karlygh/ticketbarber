import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-subscription-cancel-page',
  standalone: true,
  template: `
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
  styles: [`
    .result-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 70vh;
      gap: 1rem;
      text-align: center;
      padding: 2rem;
    }
    .icon { font-size: 4rem; }
    h1 { font-size: 2rem; font-weight: 700; }
    p { color: #4b5563; }
    .actions { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem; }
    .btn-primary {
      padding: 0.75rem 2rem;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 0.625rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:hover { background: #4338ca; }
    .btn-secondary {
      padding: 0.75rem 2rem;
      background: transparent;
      color: #4f46e5;
      border: 2px solid #4f46e5;
      border-radius: 0.625rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class SubscriptionCancelPageComponent {
  private readonly router = inject(Router);

  tryAgain(): void { void this.router.navigateByUrl('/subscription'); }
  goHome(): void { void this.router.navigateByUrl('/'); }
}
