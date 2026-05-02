import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TvAuthService } from '../../core/services/tv-auth.service';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { APP_ROUTES } from '../../shared/routing/app-routes';

@Component({
  selector: 'app-tv-pairing',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './tv-pairing.component.html',
  styleUrl: './tv-pairing.component.css'
})
export class TvPairingComponent implements OnInit, OnDestroy {
  private readonly tvAuthService = inject(TvAuthService);
  readonly routes = APP_ROUTES;

  readonly code = signal('');
  readonly now = signal(Date.now());
  readonly formattedCode = computed(() => {
    const c = this.code();
    return c ? `${c.slice(0, 3)}-${c.slice(3)}` : '';
  });
  readonly expiresAt = signal(0);
  readonly secondsLeft = computed(() => {
    const expiresAt = this.expiresAt();
    if (!expiresAt) return 0;
    return Math.max(0, Math.ceil((expiresAt - this.now()) / 1000));
  });
  readonly status = signal<'idle' | 'loading' | 'ready' | 'linked' | 'expired' | 'error'>('idle');
  readonly errorMsg = signal('');
  readonly linkedDeviceId = signal('');
  readonly confirmModalOpen = signal(true);

  private countdownInterval?: number;
  private linkCheckInterval?: number;

  ngOnInit(): void {
    this.startCountdown();
  }

  async confirmGenerateCode(): Promise<void> {
    this.confirmModalOpen.set(false);
    await this.loadCode();
  }

  cancelGenerateCode(): void {
    this.confirmModalOpen.set(false);
  }

  private async loadCode(forceNew = false): Promise<void> {
    this.stopLinkCheck();
    this.status.set('loading');
    this.errorMsg.set('');
    this.linkedDeviceId.set('');

    try {
      const activeCode = await this.tvAuthService.ensurePairingCode(forceNew);
      this.code.set(activeCode.code);
      this.expiresAt.set(activeCode.expiresAt);
      const nextStatus = this.secondsLeft() > 0 ? 'ready' : 'expired';
      this.status.set(nextStatus);
      if (nextStatus === 'ready') {
        this.startLinkCheck(activeCode.code);
      }
    } catch {
      this.status.set('error');
      this.errorMsg.set('No pudimos preparar tu código. Inténtalo otra vez.');
    }
  }

  private startCountdown(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = window.setInterval(() => {
      this.now.set(Date.now());
      if (this.status() === 'ready' && this.secondsLeft() <= 0) {
        this.stopLinkCheck();
        this.status.set('expired');
      }
    }, 1000);
  }

  private startLinkCheck(code: string): void {
    this.stopLinkCheck();
    this.linkCheckInterval = window.setInterval(() => {
      void this.checkIfLinked(code);
    }, 3000);
  }

  private stopLinkCheck(): void {
    if (this.linkCheckInterval) clearInterval(this.linkCheckInterval);
  }

  private async checkIfLinked(code: string): Promise<void> {
    if (this.status() !== 'ready' || this.code() !== code) {
      return;
    }

    const pairingStatus = await this.tvAuthService.getPairingCodeStatus(code);

    if (!pairingStatus.exists || pairingStatus.expired) {
      this.stopLinkCheck();
      this.status.set('expired');
      return;
    }

    if (pairingStatus.consumed) {
      this.stopLinkCheck();
      this.linkedDeviceId.set(pairingStatus.deviceId ?? '');
      this.status.set('linked');
    }
  }

  private cleanup(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.stopLinkCheck();
  }

  async regenerate(): Promise<void> {
    await this.loadCode(true);
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
