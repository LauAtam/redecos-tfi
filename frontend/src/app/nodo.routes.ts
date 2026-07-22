import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const nodoRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/nodo/dashboard/nodo-dashboard.page').then((m) => m.NodoDashboardPage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['NODO'] },
  },
  {
    path: 'logistica',
    loadComponent: () => import('./pages/nodo/logistica/nodo-logistica.page').then((m) => m.NodoLogisticaPage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['NODO'] },
  },
  {
    path: 'estadisticas',
    loadComponent: () => import('./pages/nodo/estadisticas/nodo-estadisticas.page').then((m) => m.NodoEstadisticasPage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['NODO'] },
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
