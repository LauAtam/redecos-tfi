import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { filter, map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  return supabaseService.authInitialized$.pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => {
      return supabaseService.currentUserValue ? true : router.parseUrl('/login');
    }),
  );
};
