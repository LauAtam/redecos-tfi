import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

export const guestGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  // 1. Validamos sincrónicamente desde memoria si ya está inicializado el estado de Supabase
  if (supabaseService.authInitialized()) {
    return !supabaseService.currentUser() ? true : router.parseUrl('/home');
  }

  // 2. Si todavía no se inicializó, esperamos la primera emisión de onAuthStateChange
  return toObservable(supabaseService.authInitialized).pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => {
      return !supabaseService.currentUser() ? true : router.parseUrl('/home');
    })
  );
};
