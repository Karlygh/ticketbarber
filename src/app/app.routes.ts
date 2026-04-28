import { Routes } from '@angular/router';
import { staffAuthGuard } from './core/auth/staff-auth.guard';
import { staffGuestGuard } from './core/auth/staff-guest.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-page.component').then((m) => m.HomePageComponent)
  },
  {
    path: 'kiosk',
    canActivate: [staffAuthGuard],
    loadComponent: () =>
      import('./features/kiosk/kiosk-page.component').then((m) => m.KioskPageComponent)
  },
  {
    path: 'tv',
    canActivate: [staffAuthGuard],
    loadComponent: () => import('./features/tv/tv-page.component').then((m) => m.TvPageComponent)
  },
  {
    path: 'guia-tv',
    loadComponent: () =>
      import('./features/staff/staff-tv-setup-page.component').then(
        (m) => m.StaffTvSetupPageComponent
      )
  },
  {
    path: 'staff/login',
    canActivate: [staffGuestGuard],
    loadComponent: () =>
      import('./features/staff/staff-login-page.component').then((m) => m.StaffLoginPageComponent)
  },
  {
    path: 'staff/register',
    canActivate: [staffGuestGuard],
    loadComponent: () =>
      import('./features/staff/staff-register-page.component').then((m) => m.StaffRegisterPageComponent)
  },
  {
    path: 'staff',
    canActivate: [staffAuthGuard],
    loadComponent: () =>
      import('./features/staff/staff-page.component').then((m) => m.StaffPageComponent)
  },
  {
    path: 'staff/tv-setup',
    canActivate: [staffAuthGuard],
    loadComponent: () =>
      import('./features/staff/staff-tv-setup-page.component').then(
        (m) => m.StaffTvSetupPageComponent
      )
  },
  {
    path: 'legal/terminos',
    loadComponent: () =>
      import('./features/legal/terminos-page.component').then((m) => m.TerminosPageComponent)
  },
  {
    path: 'legal/privacidad',
    loadComponent: () =>
      import('./features/legal/privacidad-page.component').then((m) => m.PrivacidadPageComponent)
  },
  {
    path: 'legal/cookies',
    loadComponent: () =>
      import('./features/legal/cookies-page.component').then((m) => m.CookiesPageComponent)
  },
  // ── Página de precios (pública) ─────────────────────────────────────────────
  {
    path: 'pricing',
    loadComponent: () =>
      import('./features/pricing/pricing-page.component').then(
        (m) => m.PricingPageComponent
      )
  },
  // ── Suscripción Stripe ──────────────────────────────────────────────────────
  {
    path: 'subscription',
    canActivate: [staffAuthGuard],
    loadComponent: () =>
      import('./features/subscription/subscription-page.component').then(
        (m) => m.SubscriptionPageComponent
      )
  },
  {
    path: 'subscription/success',
    canActivate: [staffAuthGuard],
    loadComponent: () =>
      import('./features/subscription/subscription-success-page.component').then(
        (m) => m.SubscriptionSuccessPageComponent
      )
  },
  {
    path: 'subscription/cancel',
    loadComponent: () =>
      import('./features/subscription/subscription-cancel-page.component').then(
        (m) => m.SubscriptionCancelPageComponent
      )
  },
  {
    path: 'subscription/manage',
    canActivate: [staffAuthGuard],
    loadComponent: () =>
      import('./features/subscription/subscription-management-page.component').then(
        (m) => m.SubscriptionManagementPageComponent
      )
  },
  // ── Cuenta de usuario ───────────────────────────────────────────────────────
  {
    path: 'account',
    canActivate: [staffAuthGuard],
    loadComponent: () =>
      import('./features/account/account-page.component').then(
        (m) => m.AccountPageComponent
      )
  },
  {
    path: '404',
    loadComponent: () =>
      import('./features/errors/not-found-page.component').then(
        (m) => m.NotFoundPageComponent
      )
  },
  {
    path: '**',
    redirectTo: '404'
  }
];
