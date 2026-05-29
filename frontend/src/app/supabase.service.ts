import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { AuthResponse, Profile, AppError } from './core/models/auth.models';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  // CACHE: BehaviorSubject guarda el estado actual del perfil
  private currentUserSubject = new BehaviorSubject<Profile | null>(null);

  // Exponemos el estado como Observable para que los componentes se suscriban
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
    );

    // Intentamos inicializar el usuario si ya hay una sesión activa en el navegador
    this.initializeUser();
  }

  private async initializeUser() {
    const { data } = await this.supabase.auth.getSession();
    if (data.session) {
      await this.refreshUserProfile(data.session.user.id);
    }
  }

  private async refreshUserProfile(userId: string) {
    const { user } = await this.getUserProfile(userId);
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  // Getter síncrono por conveniencia (para los Guards)
  public get currentUserValue(): Profile | null {
    return this.currentUserSubject.value;
  }

  private mapError(error: any): AppError {
    if (!error) {
      return {
        code: 'unknown',
        message: 'Error desconocido',
      };
    }

    const status = error.status;
    const errorCode = error.code; // Supabase a veces envía un código específico (ej: 'user_already_exists')
    const errorMessage = (error.message || '').toLowerCase();

    let code = 'auth/error';
    let message = error.message || 'Error de conexión con el servidor.';

    // 1. Intentar mapear por el código de error explícito (si existe y es confiable)
    if (errorCode === 'user_already_exists') {
      return {
        code: 'auth/user-already-exists',
        message: 'El correo electrónico ya se encuentra registrado.',
        originalError: error,
      };
    }
    if (errorCode === 'invalid_credentials') {
      return {
        code: 'auth/invalid-credentials',
        message:
          'Credenciales inválidas. Por favor, verifica tu correo y contraseña.',
        originalError: error,
      };
    }

    // 2. Fallback: Mapeo por Status HTTP + Regex/Contenido (más flexible que un string exacto)
    switch (status) {
      case 400:
        if (/already registered|already in use|ya existe/i.test(errorMessage)) {
          code = 'auth/user-already-exists';
          message = 'El correo electrónico ya se encuentra registrado.';
        } else if (/invalid.*credentials|invalid login/i.test(errorMessage)) {
          code = 'auth/invalid-credentials';
          message =
            'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
        } else {
          code = 'auth/bad-request';
          message = 'La solicitud es inválida. Revisa los datos ingresados.';
        }
        break;
      case 422:
        code = 'auth/invalid-data';
        message = 'Los datos proporcionados no son válidos.';
        break;
      case 'over_query_limit': // Error específico de rate limit
        code = 'auth/too-many-requests';
        message = 'Se ha excedido el límite de solicitudes. Intente más tarde.';
        break;
      case 429: // Standard HTTP rate limit
        code = 'auth/too-many-requests';
        message = 'Demasiados intentos. Por favor, espera un momento.';
        break;
    }

    return { code, message, originalError: error };
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'CLIENTE', // Consistente con DB
          },
        },
      });

      if (error) {
        return { user: null, error: this.mapError(error) };
      }

      const profile: Profile = {
        id: data.user?.id || '',
        email: data.user?.email || '',
        first_name: data.user?.user_metadata?.['first_name'] || firstName,
        last_name: data.user?.user_metadata?.['last_name'] || lastName,
        role: data.user?.user_metadata?.['role'] || 'CLIENTE',
      };

      return { user: profile, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          code: 'auth/unexpected',
          message: 'Ocurrió un error inesperado durante el registro.',
          originalError: err,
        },
      };
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: this.mapError(error) };
      }

      // Una vez logueado, intentamos traer el perfil completo desde la tabla profiles
      const { user, error: profileError } = await this.getUserProfile(
        data.user.id,
      );

      if (profileError) {
        // Si hay error de perfil, al menos devolvemos la info básica del user de auth
        const basicProfile: Profile = {
          id: data.user?.id || '',
          email: data.user?.email || '',
          first_name: data.user?.user_metadata?.['first_name'] || '',
          last_name: data.user?.user_metadata?.['last_name'] || '',
          role: data.user?.user_metadata?.['role'] || '',
        };
        this.currentUserSubject.next(basicProfile); // ACTUALIZAMOS CACHE
        return { user: basicProfile, error: null };
      }

      this.currentUserSubject.next(user); // ACTUALIZAMOS CACHE
      return { user, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          code: 'auth/unexpected',
          message: 'Ocurrió un error inesperado al intentar iniciar sesión.',
          originalError: err,
        },
      };
    }
  }

  async getUserProfile(userId: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return { user: null, error: this.mapError(error) };
      }

      return { user: data as Profile, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          code: 'auth/unexpected',
          message: 'Error al obtener el perfil de usuario.',
          originalError: err,
        },
      };
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.currentUserSubject.next(null); // LIMPIAMOS CACHE
  }

  async getSession() {
    return this.supabase.auth.getSession();
  }

  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) {
        return { user: null, error: this.mapError(error) };
      }

      // Traemos el perfil tras verificar OTP
      const { user } = await this.getUserProfile(data.user?.id || '');
      this.currentUserSubject.next(user); // ACTUALIZAMOS CACHE

      return { user, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          code: 'auth/unexpected',
          message: 'Error al verificar el código.',
          originalError: err,
        },
      };
    }
  }
}
