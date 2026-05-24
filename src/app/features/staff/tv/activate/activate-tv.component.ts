import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TvAuthService } from '../../../../core/services/tv-auth.service';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';

@Component({
  selector: 'app-activate-tv',
  standalone: true,
  imports: [FormsModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './activate-tv.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './activate-tv.component.css'
})
export class ActivateTvComponent {
  private readonly router = inject(Router);
  private readonly tvAuthService = inject(TvAuthService);
  readonly routes = APP_ROUTES;

  readonly rawCode = signal('');
  readonly status = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly errorMsg = signal('');

  get formattedCode(): string {
    const c = this.rawCode();
    if (c.length <= 3) return c;
    return `${c.slice(0, 3)}-${c.slice(3)}`;
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    this.rawCode.set(digits);
    // Mostrar con guión visualmente
    input.value = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
  }

  async activate(): Promise<void> {
    const code = this.rawCode();
    if (code.length !== 6) {
      this.status.set('error');
      this.errorMsg.set('El código debe tener 6 dígitos');
      return;
    }

    this.status.set('loading');
    this.errorMsg.set('');

    try {
      await this.tvAuthService.redeemCode(code);
      this.status.set('success');
      window.setTimeout(() => void this.router.navigateByUrl(this.routes.tv), 1400);
    } catch (err: unknown) {
      this.status.set('error');
      this.errorMsg.set(err instanceof Error ? err.message : 'Error al vincular la TV');
    }
  }

  reset(): void {
    this.rawCode.set('');
    this.status.set('idle');
    this.errorMsg.set('');
  }

  openTvView(): void {
    void this.router.navigateByUrl(this.routes.tv);
  }
}

