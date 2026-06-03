import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { GuestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [AuthGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [GuestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
    canActivate: [GuestGuard],
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
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['ADMIN'] }
  },
  {
    path: 'nodo',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['NODO', 'ADMIN'] }
  },
  ];
