import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { UserService } from '../../../core/services/user.service';
import { logError } from '../../../core/utils/logger.util';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-account-security-page',
  standalone: true,
  imports: [RouterLink, DatePipe, HeaderComponent, FooterComponent],
  templateUrl: './account-security-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './account-security-page.component.css'
})
export class AccountSecurityPageComponent implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly userService = inject(UserService);

  readonly user = this.authStore.user;

  /** Acceso anterior al actual. ENS op.acc.5.r5.2. */
  readonly previousLoginAtMs = signal<number | null>(null);
  readonly previousLoginLoaded = signal(false);

  async ngOnInit(): Promise<void> {
    const uid = this.authStore.user()?.uid;
    if (!uid) return;

    try {
      const profile = await this.userService.getUserProfile(uid);
      this.previousLoginAtMs.set(profile?.previousLoginAtMs ?? null);
    } catch (error) {
      logError('No se pudo cargar el último acceso', error);
    } finally {
      this.previousLoginLoaded.set(true);
    }
  }

  readonly providers = computed(() => this.authStore.user()?.providerData ?? []);

  readonly isGoogleLinked = computed(() =>
    this.providers().some(p => p.providerId === 'google.com')
  );

  readonly linkedEmail = computed(() =>
    this.providers().find(p => p.providerId === 'google.com')?.email
      ?? this.authStore.user()?.email
      ?? ''
  );

  openGoogleSecurity(): void {
    window.open('https://myaccount.google.com/security', '_blank', 'noopener,noreferrer');
  }

  openGooglePassword(): void {
    window.open('https://myaccount.google.com/signinoptions/password', '_blank', 'noopener,noreferrer');
  }

  openGoogle2FA(): void {
    window.open('https://myaccount.google.com/two-step-verification', '_blank', 'noopener,noreferrer');
  }
}

