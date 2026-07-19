import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs';

export const nodeGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authInitialized$.pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => {
      const user = authService.currentUserValue;
      if (!user) {
        return true;
      }

      // Redireccionar si es NODO
      if (user.role === 'NODO') {
        return router.parseUrl('/nodo');
      }

      // Forzar a los usuarios CLIENTE a seleccionar un nodo si no tienen default_node_id
      if (user.role === 'CLIENTE' && !user.default_node_id) {
        return router.parseUrl('/cliente/seleccionar-nodo');
      }

      return true;
    })
  );
};
