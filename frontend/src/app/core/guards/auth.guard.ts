import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  // 1. Si la sesión ya se inicializó, validamos sincrónicamente desde memoria
  if (supabaseService.authInitialized()) {
    return supabaseService.currentUser() ? true : router.parseUrl('/login');
  }

  // 2. Si es la carga inicial asíncrona, esperamos la resolución de onAuthStateChange
  return toObservable(supabaseService.authInitialized).pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => {
      return supabaseService.currentUser() ? true : router.parseUrl('/login');
    }),
  );
};
