import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { AuthResponse, Profile, AppError, UserCard } from '../models/auth.models';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;

  // CACHE: BehaviorSubject y Signals guardan el estado actual del perfil
  private currentUserSubject = new BehaviorSubject<Profile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private currentUserSignal = signal<Profile | null>(null);
  public currentUser = this.currentUserSignal.asReadonly();
  public userRole = computed(() => this.currentUser()?.role || null);
  private authInitializedSubject = new BehaviorSubject<boolean>(false);
  public authInitialized$ = this.authInitializedSubject.asObservable();
  public authInitialized = signal<boolean>(false);

  private lastFetchedProfileId: string | null = null;
  private lastFetchedTime: number = 0;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          lock: async (name, acquireTimeout, fn) => {
            return await fn();
          }
        }
      }
    );

    // Escuchamos los cambios en el estado de autenticación
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (this.lastFetchedProfileId === session.user.id) {
          return;
        }

        this.authInitialized.set(false);
        this.authInitializedSubject.next(false);

        const baseProfile = this.mapUserToProfile(session.user, session.access_token);
        this.currentUserSubject.next(baseProfile);
        this.currentUserSignal.set(baseProfile);

        const now = Date.now();
        this.lastFetchedProfileId = session.user.id;
        this.lastFetchedTime = now;

        this.getUserProfile(session.user.id)
          .then(({ user: dbProfile, error }) => {
            if (dbProfile && !error) {
              const enrichedProfile = {
                ...baseProfile,
                ...dbProfile,
                role: baseProfile.role
              };
              this.currentUserSubject.next(enrichedProfile);
              this.currentUserSignal.set(enrichedProfile);
            } else if (error) {
              console.error('Error al cargar perfil en inicialización de sesión:', error);
            }
            this.authInitialized.set(true);
            this.authInitializedSubject.next(true);
          })
          .catch((e) => {
            console.error('Excepción al cargar perfil en inicialización de sesión:', e);
            this.authInitialized.set(true);
            this.authInitializedSubject.next(true);
          });
      } else {
        this.currentUserSubject.next(null);
        this.currentUserSignal.set(null);
        this.authInitialized.set(true);
        this.authInitializedSubject.next(true);
      }
    });
  }

  public get currentUserValue(): Profile | null {
    return this.currentUserSubject.value;
  }

  public getRoleFromToken(token: string): string {
    try {
      const payloadBase64 = token.split('.')[1];
      const decoded = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded.app_metadata?.role || decoded.user_metadata?.role || 'CLIENTE';
    } catch (e) {
      return 'CLIENTE';
    }
  }

  private mapUserToProfile(user: any, token?: string): Profile {
    const rawRole = token
      ? this.getRoleFromToken(token)
      : (user.app_metadata?.['role'] || user.user_metadata?.['role'] || 'CLIENTE');
    return {
      id: user.id || '',
      email: user.email || '',
      first_name: user.user_metadata?.['first_name'] || '',
      last_name: user.user_metadata?.['last_name'] || '',
      role: String(rawRole).toUpperCase(),
      default_node_id: user.user_metadata?.['default_node_id'] || undefined,
    };
  }

  private mapError(error: any): AppError {
    if (!error) {
      return { code: 'unknown', message: 'Error desconocido' };
    }

    const status = error.status;
    const errorCode = error.code;
    const errorMessage = (error.message || '').toLowerCase();

    let code = 'auth/error';
    let message = error.message || 'Error de conexión con el servidor.';

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
        message: 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.',
        originalError: error,
      };
    }

    switch (status) {
      case 400:
        if (/already registered|already in use|ya existe/i.test(errorMessage)) {
          code = 'auth/user-already-exists';
          message = 'El correo electrónico ya se encuentra registrado.';
        } else if (/invalid.*credentials|invalid login/i.test(errorMessage)) {
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
      case 429:
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
            role: 'CLIENTE',
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

      const profile = this.mapUserToProfile(data.user, data.session?.access_token);
      this.currentUserSubject.next(profile);
      this.currentUserSignal.set(profile);
      return { user: profile, error: null };
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
      const token = await this.getSessionToken();
      if (!token) {
        return {
          user: null,
          error: { code: 'auth/no-session', message: 'No hay sesión de autenticación activa.' }
        };
      }

      const isCurrentUser = userId === this.currentUserSubject.value?.id;
      const url = userId && !isCurrentUser ? `${environment.apiUrl}/profiles/${userId}` : `${environment.apiUrl}/profiles/me`;

      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return {
          user: null,
          error: { code: 'api/error', message: errData.message || 'Error al obtener el perfil del servidor.' }
        };
      }

      const dbProfile = await response.json() as Profile;
      return { user: dbProfile, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          code: 'api/unexpected',
          message: 'Error al obtener el perfil del servidor.',
          originalError: err,
        },
      };
    }
  }

  async updateProfile(dto: { first_name?: string; last_name?: string; default_node_id?: string }): Promise<AuthResponse> {
    try {
      const response = await fetch(`${environment.apiUrl}/profiles/me`, {
        method: 'PATCH',
        headers: await this.getHeaders(),
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { user: null, error: { code: 'api/error', message: errData.message || 'Error al actualizar el perfil.' } };
      }

      const updatedProfile = await response.json() as Profile;

      this.currentUserSubject.next(updatedProfile);
      this.currentUserSignal.set(updatedProfile);

      return { user: updatedProfile, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          code: 'api/unexpected',
          message: 'Error de red al actualizar el perfil.',
          originalError: err,
        },
      };
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.currentUserSubject.next(null);
    this.currentUserSignal.set(null);
    this.lastFetchedProfileId = null;
    this.lastFetchedTime = 0;
  }

  async getSession() {
    return this.supabase.auth.getSession();
  }

  async getSessionToken(): Promise<string> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token || '';
  }

  async getHeaders(): Promise<HeadersInit> {
    const token = await this.getSessionToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
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

      if (data.user) {
        const profile = this.mapUserToProfile(data.user, data.session?.access_token);
        this.currentUserSubject.next(profile);
        this.currentUserSignal.set(profile);
        return { user: profile, error: null };
      }

      return { user: null, error: { code: 'auth/unexpected', message: 'No se pudo obtener el usuario.' } };
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

  async listSavedCards(): Promise<{ data: UserCard[] | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/profiles/cards`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener tus tarjetas guardadas.' } };
      }

      const data = await response.json();
      return { data: data as UserCard[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener tarjetas guardadas.', originalError: err } };
    }
  }

  async addSavedCard(cardToken: string): Promise<{ data: UserCard | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/profiles/cards`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({ token: cardToken }),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al guardar la tarjeta.' } };
      }

      const data = await response.json();
      return { data: data as UserCard, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al guardar la tarjeta.', originalError: err } };
    }
  }

  async deleteSavedCard(cardId: string): Promise<{ success: boolean, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/profiles/cards/${cardId}`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { success: false, error: { code: 'api/error', message: errData.message || 'Error al eliminar la tarjeta.' } };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: { code: 'api/unexpected', message: 'Error de red al eliminar la tarjeta.', originalError: err } };
    }
  }
}
