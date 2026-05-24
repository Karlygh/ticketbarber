import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BrowserStorageService } from '../../core/services/browser-storage.service';
import { SubscriptionStore } from '../../core/stores/subscription.store';
import { HeaderComponent } from '../../shared/components/header/header.component';

const CELEBRATION_KEY = 'premiumCelebrationShown';

@Component({
  selector: 'app-subscription-success-page',
  standalone: true,
  imports: [DatePipe, HeaderComponent, RouterLink],
  templateUrl: './subscription-success-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './subscription-success-page.component.css'
})
export class SubscriptionSuccessPageComponent implements OnInit {
  readonly subscriptionStore = inject(SubscriptionStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storage = inject(BrowserStorageService);

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
    if (this.storage.getSessionItem(CELEBRATION_KEY) === '1') {
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
    this.storage.setSessionItem(CELEBRATION_KEY, '1');
    void this.router.navigateByUrl('/staff');
  }

  reload(): void {
    window.location.reload();
  }
}

