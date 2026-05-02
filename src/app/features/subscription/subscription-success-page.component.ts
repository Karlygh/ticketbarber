import { Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { SubscriptionStore } from '../../core/stores/subscription.store';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-subscription-success-page',
  standalone: true,
  imports: [DatePipe, HeaderComponent],
  template: `
    <app-header></app-header>
    <div class="result-page success">
      @if (confirmed()) {
        <div class="icon">🎉</div>
        <h1>¡Suscripción activada!</h1>
        <p>Tu plan Pro ya está activo. Bienvenido a TicketBarber Pro.</p>
        <p class="renew-info">
          Próxima renovación: <strong>{{ subscriptionStore.renewsOn() | date:'longDate':'':'es' }}</strong>
        </p>
        <p class="redirect-note">Redirigiendo al panel en unos segundos…</p>
        <button class="btn-primary" (click)="goToDashboard()">Ir al panel</button>
      } @else if (timedOut()) {
        <div class="icon">✅</div>
        <h1>¡Pago procesado!</h1>
        <p>Tu pago fue procesado correctamente. Puede tardar unos segundos en activarse.</p>
        <p class="hint">Recarga la página si no ves cambios.</p>
        <div class="actions">
          <button class="btn-primary" (click)="reload()">Recargar página</button>
          <button class="btn-secondary" (click)="goToDashboard()">Ir al panel</button>
        </div>
      } @else {
        <div class="icon spinner-icon">⏳</div>
        <h1>Activando tu suscripción…</h1>
        <p class="syncing">Sincronizando con Stripe. Esto puede tardar unos segundos.</p>
        <button class="btn-primary" (click)="goToDashboard()">Ir al panel</button>
      }
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
    .spinner-icon { animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    h1 { font-size: 2rem; font-weight: 700; }
    p { color: #4b5563; font-size: 1.05rem; }
    .syncing { color: #9ca3af; font-style: italic; }
    .renew-info { font-size: 0.95rem; color: #6b7280; }
    .redirect-note { font-size: 0.85rem; color: #9ca3af; font-style: italic; }
    .hint { font-size: 0.9rem; color: #6b7280; }
    .actions { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem; }
    .btn-primary {
      margin-top: 1rem;
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
      margin-top: 1rem;
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
export class SubscriptionSuccessPageComponent implements OnInit {
  readonly subscriptionStore = inject(SubscriptionStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly confirmed = signal(false);
  readonly timedOut = signal(false);

  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private redirectId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Efecto reactivo: cuando isPro se vuelve true, confirmar y auto-redirigir
    effect(() => {
      if (this.subscriptionStore.isPro() && !this.confirmed()) {
        this.confirmed.set(true);
        this.timedOut.set(false);
        if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
        // Auto-redirect a /staff tras 3s
        this.redirectId = setTimeout(() => this.goToDashboard(), 3000);
      }
    });
  }

  ngOnInit(): void {
    // Timeout de 10s: si isPro no se activa, mostrar mensaje de fallback
    this.timeoutId = setTimeout(() => {
      if (!this.confirmed()) {
        this.timedOut.set(true);
      }
    }, 10_000);

    // Cleanup al destruir
    this.destroyRef.onDestroy(() => {
      if (this.timeoutId) clearTimeout(this.timeoutId);
      if (this.redirectId) clearTimeout(this.redirectId);
    });
  }

  goToDashboard(): void {
    void this.router.navigateByUrl('/staff');
  }

  reload(): void {
    window.location.reload();
  }
}
