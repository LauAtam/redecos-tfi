import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = route.data?.['expectedRoles'] as string[];

  return authService.authInitialized$.pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => {
      const role = authService.userRole();
      if (role && expectedRoles.includes(role)) {
        return true;
      }
      return router.parseUrl('/restricted');
    })
  );
};
