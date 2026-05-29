import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { Observable, from, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  
  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return from(this.supabaseService.getSession()).pipe(
      map(session => {
        if (!session.data.session) {
          return true;
        } else {
          // Si ya está logueado, lo mandamos al home (el home redirigirá por rol si fuera necesario)
          return this.router.parseUrl('/home');
        }
      })
    );
  }
}
