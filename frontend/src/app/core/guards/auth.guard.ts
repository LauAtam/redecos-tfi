import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { Observable, from, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return from(this.supabaseService.getSession()).pipe(
      map(session => {
        if (session.data.session) {
          return true;
        } else {
          return this.router.parseUrl('/login');
        }
      })
    );
  }
}
