import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { filter, map, take } from 'rxjs';

export const nodeGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  return supabaseService.authInitialized$.pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => {
      const user = supabaseService.currentUserValue;
      if (!user) {
        return true;
      }

      // Redireccionar si es NODO
      if (user.role === 'NODO') {
        return router.parseUrl('/nodo');
      }

      // Forzar a los usuarios CLIENTE a seleccionar un nodo si no tienen default_node_id
      if (user.role === 'CLIENTE' && !user.default_node_id) {
        return router.parseUrl('/pages/select-node');
      }

      return true;
    })
  );
};
