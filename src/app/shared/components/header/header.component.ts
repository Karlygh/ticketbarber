import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../core/stores/subscription.store';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.Default
})
export class HeaderComponent {
  readonly authStore = inject(AuthStore);
  readonly subscriptionStore = inject(SubscriptionStore);
  private readonly router = inject(Router);
  readonly mobileMenuOpen = signal(false);

  get accountLabel(): string {
    const user = this.authStore.user();
    const baseName = user?.displayName ?? user?.email ?? 'Mi cuenta';
    return `Hola, ${baseName}`;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  async signOut(): Promise<void> {
    this.closeMobileMenu();
    await this.authStore.signOut();
    void this.router.navigateByUrl('/');
  }
}
