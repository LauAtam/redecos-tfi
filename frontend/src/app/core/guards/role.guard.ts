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

    return from(this.supabaseService.getSession()).pipe(
      switchMap(session => {
        if (!session.data.session) {
          return of(this.router.parseUrl('/login'));
        }

        return from(this.supabaseService.getUserProfile(session.data.session.user.id)).pipe(
          map(profileResp => {
            const userRole = profileResp.user?.role;
            
            if (userRole && expectedRoles.includes(userRole)) {
              return true;
            } else {
              return this.router.parseUrl('/restricted');
            }
          })
        );
      })
    );
  }
}
