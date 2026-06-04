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
        const sessionData = session.data.session;
        if (sessionData) {
          const currentTime = Math.floor(Date.now() / 1000);
          // Si el token aún es válido, permitimos el acceso
          if (sessionData.expires_at && sessionData.expires_at > currentTime) {
            return true;
          }
        }
        
        // Si no hay sesión o el token expiró, limpiamos el estado local y redirigimos
        this.supabaseService.logout();
        return this.router.parseUrl('/login');
      })
    );
  }
}
