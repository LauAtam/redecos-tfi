import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { Observable, from, map, switchMap, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  
  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const expectedRoles = route.data['expectedRoles'] as string[];

    // 1. Intentamos leer del CACHE primero (es instantáneo)
    const cachedUser = this.supabaseService.currentUserValue;
    if (cachedUser) {
      return of(this.checkRole(cachedUser.role, expectedRoles));
    }

    // 2. Si no hay cache, verificamos sesión y pedimos perfil
    return from(this.supabaseService.getSession()).pipe(
      switchMap(session => {
        if (!session.data.session) {
          return of(this.router.parseUrl('/login'));
        }

        return from(this.supabaseService.getUserProfile(session.data.session.user.id)).pipe(
          map(profileResp => {
            return this.checkRole(profileResp.user?.role, expectedRoles);
          })
        );
      })
    );
  }

  private checkRole(userRole: string | undefined, expectedRoles: string[]): boolean | UrlTree {
    if (userRole && expectedRoles.includes(userRole)) {
      return true;
    }
    return this.router.parseUrl('/restricted');
  }
}
