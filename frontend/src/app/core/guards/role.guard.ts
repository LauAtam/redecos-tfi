import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

export const roleGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);
  const expectedRoles = route.data?.['expectedRoles'] as string[];

  // 1. Validamos sincrónicamente desde memoria si ya está inicializado el estado de Supabase
  if (supabaseService.authInitialized()) {
    const role = supabaseService.userRole();
    if (role && expectedRoles.includes(role)) {
      return true;
    }
    return router.parseUrl('/restricted');
  }

  // 2. Si todavía no se inicializó, esperamos la primera emisión de onAuthStateChange
  return toObservable(supabaseService.authInitialized).pipe(
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
