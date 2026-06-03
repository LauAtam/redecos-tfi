import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { Observable, from, map, switchMap, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const expectedRoles = route.data['expectedRoles'] as string[];

    // 1. Intentamos leer del CACHE primero (es instantáneo)
    const cachedUser = this.supabaseService.currentUserValue;
    if (cachedUser) {
      return of(this.checkRole(cachedUser.role, expectedRoles));
    }

    // 2. Si no hay cache, verificamos sesión y extraemos el rol del JWT
    return from(this.supabaseService.getSession()).pipe(
      switchMap(({ data: { session } }) => {
        if (!session) {
          return of(this.router.parseUrl('/login'));
        }

        const role = session.user.app_metadata?.['role'] || session.user.user_metadata?.['role'] || 'CLIENTE';
        return of(this.checkRole(role, expectedRoles));
      }),
    );
  }

  private checkRole(
    userRole: string | undefined,
    expectedRoles: string[],
  ): boolean | UrlTree {
    if (userRole && expectedRoles.includes(userRole)) {
      return true;
    }
    return this.router.parseUrl('/restricted');
  }
}
