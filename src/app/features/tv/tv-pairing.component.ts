import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TvAuthService } from '../../core/services/tv-auth.service';

@Component({
  selector: 'app-tv-pairing',
  standalone: true,
  imports: [],
  templateUrl: './tv-pairing.component.html',
  styleUrl: './tv-pairing.component.css'
})
export class TvPairingComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly tvAuthService = inject(TvAuthService);

  readonly code = signal('');
  readonly formattedCode = computed(() => {
    const c = this.code();
    return c ? `${c.slice(0, 3)}-${c.slice(3)}` : '';
  });
  readonly secondsLeft = signal(900);
  readonly status = signal<'loading' | 'waiting' | 'expired' | 'linking' | 'error'>('loading');
  readonly errorMsg = signal('');

  private activationSub?: Subscription;
  private countdownInterval?: number;

  async ngOnInit(): Promise<void> {
    await this.initPairing();
  }

  private async initPairing(): Promise<void> {
    this.status.set('loading');
    this.errorMsg.set('');

    const deviceId = this.tvAuthService.getDeviceId();
    const pending = this.tvAuthService.getPendingCode();

    if (pending) {
      this.code.set(pending.code);
      this.secondsLeft.set(this.secondsUntil(pending.expiresAt));
      this.status.set('waiting');
      this.startCountdown();
      this.watchActivation(pending.code);
      return;
    }

    this.secondsLeft.set(900);
    const code = this.tvAuthService.generateCode();
    this.code.set(code);

    try {
      await this.tvAuthService.createDeviceCode(code, deviceId);
    } catch {
      this.status.set('error');
      this.errorMsg.set('Error al generar el código. Recarga la página.');
      return;
    }

    this.status.set('waiting');
    this.startCountdown();
    this.watchActivation(code);
  }

  private startCountdown(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = window.setInterval(() => {
      this.secondsLeft.update(s => {
        if (s <= 1) {
          this.handleExpiry();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  private watchActivation(code: string): void {
    this.activationSub?.unsubscribe();
    this.activationSub = this.tvAuthService.watchCodeActivation(code).subscribe(userId => {
      if (userId) {
        this.cleanup();
        this.status.set('linking');
        this.tvAuthService.clearPendingCode();
        this.tvAuthService.saveBinding(userId);
        void this.router.navigate(['/tv', userId]);
      }
    });
  }

  private handleExpiry(): void {
    this.cleanup();
    this.tvAuthService.clearPendingCode();
    this.status.set('expired');
  }

  private cleanup(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.activationSub?.unsubscribe();
  }

  async regenerate(): Promise<void> {
    this.cleanup();
    this.tvAuthService.clearPendingCode();
    await this.initPairing();
  }

  private secondsUntil(expiresAt: number): number {
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
