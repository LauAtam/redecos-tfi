import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { guestGuard } from './core/guards/guest.guard';
import { nodeGuard } from './core/guards/node.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard, nodeGuard],
  },
  {
    path: 'pages/select-node',
    loadComponent: () =>
      import('./pages/select-node/select-node.page').then(
        (m) => m.SelectNodePage,
      ),
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
    loadComponent: () =>
      import('./pages/admin/admin-layout/admin-layout.page').then(
        (m) => m.AdminLayoutPage,
      ),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADMIN'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard.page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'gestiones',
        loadComponent: () =>
          import('./pages/admin/gestiones/gestiones.page').then(
            (m) => m.GestionesPage,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./pages/admin/perfil/perfil.page').then(
            (m) => m.PerfilPage,
          ),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./pages/admin/productos/productos.page').then(
            (m) => m.ProductosPage,
          ),
      },
      {
        path: 'nodos',
        loadComponent: () =>
          import('./pages/admin/nodos/nodos.page').then((m) => m.NodosPage),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'nodo',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['NODO', 'ADMIN'] }
  },
];
