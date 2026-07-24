import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '',
    loadChildren: () => import('./auth.routes').then(m => m.authRoutes),
  },
  {
    path: 'cliente',
    loadChildren: () => import('./cliente.routes').then(m => m.clienteRoutes),
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin.routes').then(m => m.adminRoutes),
  },
  {
    path: 'nodo',
    loadChildren: () => import('./nodo.routes').then(m => m.nodoRoutes),
  },
  {
    path: 'restricted',
    loadComponent: () => import('./pages/restricted/restricted.page').then((m) => m.RestrictedPage),
  },
  {
    path: 'terminos-condiciones',
    loadComponent: () => import('./pages/legal/terminos-condiciones/terminos-condiciones.page').then(m => m.TerminosCondicionesPage),
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/legal/faq/faq.page').then(m => m.FaqPage),
  },
];
