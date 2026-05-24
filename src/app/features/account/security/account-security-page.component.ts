import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-account-security-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './account-security-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './account-security-page.component.css'
})
export class AccountSecurityPageComponent {
  private readonly authStore = inject(AuthStore);

  readonly user = this.authStore.user;

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

