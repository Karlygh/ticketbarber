import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../core/stores/subscription.store';
import { APP_ROUTES } from '../../routing/app-routes';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  readonly authStore = inject(AuthStore);
  readonly subscriptionStore = inject(SubscriptionStore);
  private readonly router = inject(Router);
  readonly routes = APP_ROUTES;
  readonly mobileMenuOpen = signal(false);
  readonly userMenuOpen = signal(false);

  get accountLabel(): string {
    const user = this.authStore.user();
    const baseName = user?.displayName ?? user?.email ?? 'Mi cuenta';
    return `Hola, ${baseName}`;
  }

  get trialBadgeLabel(): string {
    const days = this.subscriptionStore.trialDaysLeft();
    if (days <= 0) return 'Prueba expirada';
    if (days === 1) return '1 día de prueba';
    return `${days} días de prueba`;
  }

  toggleMobileMenu(): void {
    this.userMenuOpen.set(false);
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
    this.userMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  async signOut(): Promise<void> {
    this.closeMobileMenu();
    await this.authStore.signOut();
    void this.router.navigateByUrl(this.routes.root);
  }
}
