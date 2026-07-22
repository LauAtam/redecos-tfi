import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { nodeGuard } from './core/guards/node.guard';

export const clienteRoutes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard, nodeGuard],
  },
  {
    path: 'mis-compras',
    loadComponent: () => import('./pages/cliente/mis-compras/mis-compras.page').then((m) => m.MisComprasPage),
    canActivate: [authGuard],
  },
  {
    path: 'seleccionar-nodo',
    loadComponent: () => import('./pages/select-node/select-node.page').then((m) => m.SelectNodePage),
    canActivate: [authGuard],
  },
];
