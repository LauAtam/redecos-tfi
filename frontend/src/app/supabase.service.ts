import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { AuthResponse, Profile, AppError } from './core/models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
    );
  }

  private mapError(error: any): AppError {
    if (!error) {
      return {
        code: 'unknown',
        message: 'Error desconocido',
      };
    }

    const status = error.status || error.code;
    let code = 'auth/error';
    let message = error.message || 'Error de conexión con el servidor.';

    // Mapeo básico de errores comunes de Supabase
    switch (status) {
      case 400:
        if (error.message?.includes('User already registered')) {
          code = 'auth/user-already-exists';
          message = 'El correo electrónico ya se encuentra registrado.';
        } else if (error.message?.includes('Invalid login credentials')) {
          code = 'auth/invalid-credentials';
          message = 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
        } else {
          code = 'auth/bad-request';
          message = 'La solicitud es inválida. Revisa los datos ingresados.';
        }
        break;
      case 422:
        code = 'auth/invalid-data';
        message = 'Los datos proporcionados no son válidos.';
        break;
      case 'over_query_limit':
        code = 'auth/too-many-requests';
        message = 'Se ha excedido el límite de solicitudes. Intente más tarde.';
        break;
    }

    return { code, message, originalError: error };
  }

  async register(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'client' // Rol por defecto
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
        role: data.user?.user_metadata?.['role'] || 'client'
      };

      return { user: profile, error: null };
    } catch (err) {
      return { 
        user: null, 
        error: { 
          code: 'auth/unexpected', 
          message: 'Ocurrió un error inesperado durante el registro.',
          originalError: err 
        } 
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

      const profile: Profile = {
        id: data.user?.id || '',
        email: data.user?.email || '',
        first_name: data.user?.user_metadata?.['first_name'] || '',
        last_name: data.user?.user_metadata?.['last_name'] || '',
        role: data.user?.user_metadata?.['role'] || ''
      };

      return { user: profile, error: null };
    } catch (err) {
      return { 
        user: null, 
        error: { 
          code: 'auth/unexpected', 
          message: 'Ocurrió un error inesperado al intentar iniciar sesión.',
          originalError: err
        } 
      };
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async getSession() {
    return this.supabase.auth.getSession();
  }

  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) {
        return { user: null, error: this.mapError(error) };
      }

      const profile: Profile = {
        id: data.user?.id || '',
        email: data.user?.email || '',
        first_name: data.user?.user_metadata?.['first_name'] || '',
        last_name: data.user?.user_metadata?.['last_name'] || '',
        role: data.user?.user_metadata?.['role'] || ''
      };

      return { user: profile, error: null };
    } catch (err) {
      return { 
        user: null, 
        error: { 
          code: 'auth/unexpected', 
          message: 'Error al verificar el código.', 
          originalError: err 
        } 
      };
    }
  }
}
