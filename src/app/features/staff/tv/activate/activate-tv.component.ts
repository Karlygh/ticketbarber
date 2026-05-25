import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TvAuthService, TvBindingFailureReason } from '../../../../core/services/tv-auth.service';
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
export class ActivateTvComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tvAuthService = inject(TvAuthService);
  readonly routes = APP_ROUTES;

  readonly rawCode = signal('');
  readonly status = signal<'idle' | 'checking-binding' | 'loading' | 'success' | 'error' | 'already-linked'>('idle');
  readonly errorMsg = signal('');
  readonly infoMsg = signal('');

  async ngOnInit(): Promise<void> {
    this.applyRouteReasonMessage();
    this.status.set('checking-binding');

    const binding = await this.tvAuthService.validateBinding();
    if (binding.valid) {
      this.status.set('already-linked');
      this.infoMsg.set('Esta TV ya está vinculada. Abriendo cola...');
      window.setTimeout(() => void this.router.navigateByUrl(this.routes.tv), 1200);
      return;
    }

    if (!this.infoMsg() && binding.reason) {
      this.infoMsg.set(this.messageForReason(binding.reason));
    }

    this.status.set('idle');
  }

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

  private applyRouteReasonMessage(): void {
    const reason = this.route.snapshot.queryParamMap.get('reason') as TvBindingFailureReason | null;
    if (!reason) {
      this.infoMsg.set('');
      return;
    }

    this.infoMsg.set(this.messageForReason(reason));
  }

  private messageForReason(reason: TvBindingFailureReason): string {
    switch (reason) {
      case 'missing':
        return 'Esta pantalla necesita vincularse con un código. Si cambiaste de navegador o borraste datos, solo tienes que volver a vincularla.';
      case 'not_found':
        return 'Esta pantalla necesita volver a vincularse con un nuevo código porque la TV fue eliminada de tu lista de dispositivos.';
      case 'owner_mismatch':
        return 'Esta pantalla estaba vinculada a otra cuenta. Para usarla aquí, vuelve a vincularla con un código nuevo.';
      case 'revoked':
        return 'Esta pantalla ya no está vinculada a tu cuenta. Introduce un código nuevo para recuperarla.';
      case 'unavailable':
        return 'No hemos podido validar la vinculación en este momento. Comprueba la conexión y vuelve a intentarlo en unos segundos.';
    }
  }
}

