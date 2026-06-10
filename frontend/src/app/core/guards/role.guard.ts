import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { filter, map, take } from 'rxjs';

export const roleGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);
  const expectedRoles = route.data?.['expectedRoles'] as string[];

  return supabaseService.authInitialized$.pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => {
      const role = supabaseService.userRole();
      if (role && expectedRoles.includes(role)) {
        return true;
      }
      return router.parseUrl('/restricted');
    })
  );
};
