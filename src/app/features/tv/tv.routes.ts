import { Routes } from '@angular/router';
import { staffAuthGuard } from '../../core/auth/staff-auth.guard';
import { proGuard } from '../../core/auth/pro.guard';

export const TV_ROUTES: Routes = [
  {
    path: 'pair',
    canActivate: [staffAuthGuard, proGuard],
    loadComponent: () =>
      import('./pairing/tv-pairing.component').then((m) => m.TvPairingComponent)
  },
  {
    path: ':shopId',
    loadComponent: () =>
      import('./tv-page.component').then((m) => m.TvPageComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./tv-page.component').then((m) => m.TvPageComponent)
  }
];
