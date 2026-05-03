import { Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionStore } from '../../core/stores/subscription.store';
import { HeaderComponent } from '../../shared/components/header/header.component';

const CELEBRATION_KEY = 'premiumCelebrationShown';

@Component({
  selector: 'app-subscription-success-page',
  standalone: true,
  imports: [DatePipe, HeaderComponent, RouterLink],
  template: `
    <app-header></app-header>

    <div class="success-page">

      <!-- ── Estado: activando (spinner) ─────────────────────────── -->
      @if (!confirmed() && !timedOut()) {
        <div class="state-card state-card--syncing">
          <div class="spinner-ring"></div>
          <h1 class="state-title">Activando tu cuenta Premium…</h1>
          <p class="state-sub">Sincronizando con Stripe. Esto tarda solo unos segundos.</p>
          <button class="btn-ghost" (click)="goToDashboard()">Ir al panel igualmente</button>
        </div>
      }

      <!-- ── Estado: confirmado (celebración) ────────────────────── -->
      @if (confirmed()) {
        <div class="celebration-card">

          <div class="crown-wrap">
            <span class="crown" aria-hidden="true">👑</span>
            <div class="crown-glow"></div>
          </div>

          <p class="label-premium">PLAN PREMIUM ACTIVADO</p>
          <h1 class="title-premium">¡Ya eres Premium!</h1>
          <p class="subtitle">Has desbloqueado todas las funciones de TicketBarber.</p>

          <ul class="benefits-list" aria-label="Beneficios desbloqueados">
            <li><span class="check" aria-hidden="true">✓</span>Kiosk para que tus clientes cojan turno solos</li>
            <li><span class="check" aria-hidden="true">✓</span>Pantalla TV con la cola en tiempo real</li>
            <li><span class="check" aria-hidden="true">✓</span>Control total de la cola desde el panel</li>
          </ul>

          <div class="renew-row">
            <span class="renew-icon" aria-hidden="true">🗓</span>
            <span>Próxima renovación:&nbsp;<strong>{{ subscriptionStore.renewsOn() | date:'longDate':'':'es' }}</strong></span>
          </div>

          <div class="cta-group">
            <button class="btn-primary" (click)="goToDashboard()">
              Ir al panel&nbsp;→
            </button>
            <a class="link-secondary" routerLink="/subscription/manage">Ver mi suscripción</a>
          </div>

        </div>
      }

      <!-- ── Estado: timeout fallback ────────────────────────────── -->
      @if (timedOut()) {
        <div class="state-card state-card--timeout">
          <div class="icon-check" aria-hidden="true">✅</div>
          <h1 class="state-title">¡Pago procesado!</h1>
          <p class="state-sub">Tu pago fue recibido correctamente. La activación puede tardar unos segundos más.</p>
          <p class="hint">Si no ves cambios en 1 minuto, recarga la página.</p>
          <div class="actions">
            <button class="btn-primary" (click)="reload()">Recargar página</button>
            <button class="btn-ghost" (click)="goToDashboard()">Ir al panel</button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    /* ── Page shell ───────────────────────────────────────────────── */
    :host {
      display: block;
      min-height: 100vh;
      background: #0d1b2a;
      color: #ffffff;
    }

    .success-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 64px);
      padding: 2rem 1rem;
    }

    /* ── Celebration card ─────────────────────────────────────────── */
    .celebration-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      text-align: center;
      max-width: 540px;
      width: 100%;
      padding: 2.5rem 2rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1.25rem;
      backdrop-filter: blur(12px);
      animation: card-in 0.5s ease both;
    }

    @keyframes card-in {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Crown */
    .crown-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .crown {
      font-size: 5rem;
      display: block;
      animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      position: relative;
      z-index: 1;
    }

    @keyframes bounce-in {
      0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
      60%  { transform: scale(1.2) rotate(5deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }

    .crown-glow {
      position: absolute;
      inset: -12px;
      background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
      border-radius: 50%;
      animation: glow-pulse 2.5s ease-in-out infinite;
    }

    @keyframes glow-pulse {
      0%, 100% { transform: scale(0.9); opacity: 0.6; }
      50%       { transform: scale(1.1); opacity: 1; }
    }

    /* Labels & title */
    .label-premium {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #00e5d4;
      margin: 0;
    }

    .title-premium {
      font-size: 2.25rem;
      font-weight: 800;
      color: #FFD700;
      margin: 0;
      line-height: 1.1;
      text-shadow: 0 0 32px rgba(255, 215, 0, 0.35);
    }

    .subtitle {
      font-size: 1.05rem;
      color: rgba(255, 255, 255, 0.75);
      margin: 0;
    }

    /* Benefits */
    .benefits-list {
      list-style: none;
      padding: 0;
      margin: 0.25rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      width: 100%;
      max-width: 380px;
    }

    .benefits-list li {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.97rem;
      color: rgba(255, 255, 255, 0.85);
      text-align: left;
      padding: 0.5rem 0.75rem;
      background: rgba(0, 229, 212, 0.06);
      border-radius: 0.5rem;
      border-left: 3px solid #00e5d4;
    }

    .check {
      color: #00e5d4;
      font-weight: 700;
      font-size: 1rem;
      flex-shrink: 0;
    }

    /* Renewal row */
    .renew-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.88rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .renew-row strong {
      color: rgba(255, 255, 255, 0.75);
    }

    /* CTA group */
    .cta-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
      width: 100%;
    }

    .btn-primary {
      width: 100%;
      max-width: 320px;
      padding: 0.875rem 2rem;
      background: #00e5d4;
      color: #0d1b2a;
      border: none;
      border-radius: 0.75rem;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: filter 0.18s ease, transform 0.18s ease;
    }

    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .link-secondary {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.45);
      text-decoration: none;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .link-secondary:hover {
      color: rgba(255, 255, 255, 0.8);
    }

    /* ── State card (spinner / timeout) ──────────────────────────── */
    .state-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      text-align: center;
      max-width: 480px;
      width: 100%;
      padding: 2.5rem 2rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1.25rem;
    }

    .state-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }

    .state-sub {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.55);
      margin: 0;
    }

    .hint {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.35);
    }

    /* Spinner ring */
    .spinner-ring {
      width: 56px;
      height: 56px;
      border: 4px solid rgba(0, 229, 212, 0.15);
      border-top-color: #00e5d4;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .icon-check {
      font-size: 3.5rem;
    }

    /* Ghost button */
    .btn-ghost {
      margin-top: 0.25rem;
      padding: 0.625rem 1.5rem;
      background: transparent;
      color: rgba(255, 255, 255, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.625rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.15s ease, color 0.15s ease;
    }

    .btn-ghost:hover {
      border-color: rgba(255, 255, 255, 0.5);
      color: rgba(255, 255, 255, 0.85);
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 0.5rem;
    }

    /* ── Responsive ───────────────────────────────────────────────── */
    @media (max-width: 480px) {
      .title-premium { font-size: 1.75rem; }
      .celebration-card { padding: 2rem 1.25rem; }
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

  constructor() {
    effect(() => {
      if (this.subscriptionStore.isPro() && !this.confirmed()) {
        this.confirmed.set(true);
        this.timedOut.set(false);
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
        // NO escribir sessionStorage aquí — se escribe solo al navegar,
        // para que la celebración siempre se muestre la primera vez.
      }
    });
  }

  ngOnInit(): void {
    // Si el usuario vuelve atrás desde /staff, saltar la celebración
    if (sessionStorage.getItem(CELEBRATION_KEY) === '1') {
      void this.router.navigateByUrl('/staff');
      return;
    }

    // Fallback: si isPro no se activa en 10s, mostrar mensaje de pago procesado
    this.timeoutId = setTimeout(() => {
      if (!this.confirmed()) {
        this.timedOut.set(true);
      }
    }, 10_000);

    this.destroyRef.onDestroy(() => {
      if (this.timeoutId) clearTimeout(this.timeoutId);
    });
  }

  goToDashboard(): void {
    sessionStorage.setItem(CELEBRATION_KEY, '1');
    void this.router.navigateByUrl('/staff');
  }

  reload(): void {
    window.location.reload();
  }
}
