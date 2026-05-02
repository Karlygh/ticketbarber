import { Routes } from '@angular/router';
import { staffAuthGuard } from './core/auth/staff-auth.guard';
import { staffGuestGuard } from './core/auth/staff-guest.guard';
import { proGuard } from './core/auth/pro.guard';

export const routes: Routes = [
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: '',
    loadComponent: () => import('./features/home/home-page.component').then((m) => m.HomePageComponent)
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./features/contact/contact-page.component').then((m) => m.ContactPageComponent)
  },
  {
    path: 'contacto/guia-consultas',
    loadComponent: () =>
      import('./features/contact/help/contact-help-page.component').then((m) => m.ContactHelpPageComponent)
  },
  {
    path: 'kiosk',
    canActivate: [staffAuthGuard, proGuard],
    loadComponent: () =>
      import('./features/kiosk/kiosk-page.component').then((m) => m.KioskPageComponent)
  },
  {
    path: 'tv',
    children: [
      {
        path: 'pair',
        canActivate: [staffAuthGuard, proGuard],
        loadComponent: () =>
          import('./features/tv/tv-pairing.component').then(m => m.TvPairingComponent)
      },
      {
        path: ':shopId',
        loadComponent: () =>
          import('./features/tv/tv-page.component').then(m => m.TvPageComponent)
      },
      {
        path: '',
        loadComponent: () =>
          import('./features/tv/tv-page.component').then(m => m.TvPageComponent)
      }
    ]
  },
  {
    path: 'activate',
    loadComponent: () =>
      import('./features/staff/tv/activate/activate-tv.component').then(m => m.ActivateTvComponent)
  },
  {
    path: 'staff/tv/generate-code',
    redirectTo: 'tv/pair',
    pathMatch: 'full'
  },
  {
    path: 'staff/devices',
    canActivate: [staffAuthGuard, proGuard],
    loadComponent: () =>
      import('./features/staff/tv/devices/devices-management.component').then(m => m.DevicesManagementComponent)
  },
  {
    path: 'guia-tv',
    loadComponent: () =>
      import('./features/staff/tv/setup/staff-tv-setup-page.component').then(
        (m) => m.StaffTvSetupPageComponent
      )
  },
  {
    path: 'staff/start',
    loadComponent: () =>
      import('./features/staff/auth/trial-start/staff-trial-start-page.component').then(
        (m) => m.StaffTrialStartPageComponent
      )
  },
  {
    path: 'staff/login',
    canActivate: [staffGuestGuard],
    loadComponent: () =>
      import('./features/staff/auth/login/staff-login-page.component').then((m) => m.StaffLoginPageComponent)
  },
  {
    path: 'staff/register',
    canActivate: [staffGuestGuard],
    loadComponent: () =>
      import('./features/staff/auth/register/staff-register-page.component').then((m) => m.StaffRegisterPageComponent)
  },
  {
    path: 'staff',
    canActivate: [staffAuthGuard, proGuard],
    loadComponent: () =>
      import('./features/staff/dashboard/staff-page.component').then((m) => m.StaffPageComponent)
  },
  {
    path: 'staff/tv-setup',
    canActivate: [staffAuthGuard, proGuard],
    loadComponent: () =>
      import('./features/staff/tv/setup/staff-tv-setup-page.component').then(
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
    path: 'account/seguridad',
    canActivate: [staffAuthGuard],
    loadComponent: () =>
      import('./features/account/security/account-security-page.component').then(
        (m) => m.AccountSecurityPageComponent
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
