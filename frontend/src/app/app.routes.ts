import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
    canActivate: [guestGuard],
  },
  {
    path: 'restricted',
    loadComponent: () =>
      import('./pages/restricted/restricted.page').then(
        (m) => m.RestrictedPage,
      ),
  },
  {
    path: 'admin',
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin/dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      {
        path: 'nodos',
        loadComponent: () => import('./pages/admin/nodos/nodos.page').then(m => m.NodosPage)
      },
      {
        path: 'productos',
        loadComponent: () => import('./pages/admin/productos/productos.page').then(m => m.ProductosPage)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ],
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADMIN'] }
  },
  {
    path: 'nodo',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['NODO', 'ADMIN'] }
  },
];
