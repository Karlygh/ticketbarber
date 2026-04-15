import { Routes } from '@angular/router';
import { staffAuthGuard } from './core/auth/staff-auth.guard';

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
    path: 'staff/login',
    loadComponent: () =>
      import('./features/staff/staff-login-page.component').then((m) => m.StaffLoginPageComponent)
  },
  {
    path: 'staff',
    canActivate: [staffAuthGuard],
    loadComponent: () =>
      import('./features/staff/staff-page.component').then((m) => m.StaffPageComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
