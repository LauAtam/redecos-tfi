import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs';

export const guestGuard: CanActivateFn = (route, state) => {
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

      // Redirección inteligente basada en rol
      switch (user.role) {
        case 'ADMIN':
          return router.parseUrl('/admin/dashboard');
        case 'NODO':
          return router.parseUrl('/nodo');
        case 'CLIENTE':
        default:
          return router.parseUrl('/cliente/home');
      }
    })
  );
};
