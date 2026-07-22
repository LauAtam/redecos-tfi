import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/admin/admin-layout/admin-layout.page').then((m) => m.AdminLayoutPage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADMIN'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'gestiones',
        loadComponent: () => import('./pages/admin/gestiones/gestiones.page').then((m) => m.GestionesPage),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/admin/perfil/perfil.page').then((m) => m.PerfilPage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADMIN'] },
  },
  {
    path: 'productos',
    loadComponent: () => import('./pages/admin/productos/productos.page').then((m) => m.ProductosPage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADMIN'] },
  },
  {
    path: 'nodos',
    loadComponent: () => import('./pages/admin/nodos/nodos.page').then((m) => m.NodosPage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADMIN'] },
  },
  {
    path: 'logistica',
    loadComponent: () => import('./pages/admin/gestiones/logistica/admin-logistica.page').then((m) => m.AdminLogisticaPage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADMIN'] },
  },
];
