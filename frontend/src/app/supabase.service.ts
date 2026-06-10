import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { AuthResponse, Profile, AppError, Nodo, Producto } from './core/models/auth.models';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
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
        // Marcamos como no inicializado mientras cargamos el perfil enriquecido de la base de datos
        this.authInitialized.set(false);
        this.authInitializedSubject.next(false);

        const baseProfile = this.mapUserToProfile(session.user, session.access_token);
        this.currentUserSubject.next(baseProfile);
        this.currentUserSignal.set(baseProfile);

        // Obtenemos el perfil completo en segundo plano para no bloquear onAuthStateChange
        this.getUserProfile(session.user.id)
          .then(({ user: dbProfile, error }) => {
            if (dbProfile && !error) {
              const enrichedProfile = {
                ...baseProfile,
                ...dbProfile,
                role: baseProfile.role // Priorizar rol de token
              };
              this.currentUserSubject.next(enrichedProfile);
              this.currentUserSignal.set(enrichedProfile);
            }
            this.authInitialized.set(true);
            this.authInitializedSubject.next(true);
          })
          .catch((e) => {
            console.error('Error fetching profile from DB:', e);
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

      const profile = this.mapUserToProfile(data.user, data.session?.access_token);
      this.currentUserSubject.next(profile); // ACTUALIZAMOS CACHE
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

  async updateProfile(dto: { first_name?: string; last_name?: string; default_node_id?: string }): Promise<AuthResponse> {
    try {
      const { data: sessionData } = await this.supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const response = await fetch(`${environment.apiUrl}/profiles/me`, {
        method: 'PATCH',
        headers: this.getHeaders(token),
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { user: null, error: { code: 'api/error', message: errData.message || 'Error al actualizar el perfil.' } };
      }

      const updatedProfile = await response.json() as Profile;
      
      // Actualizamos cache/ BehaviorSubject y Signals en el servicio
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
    this.currentUserSubject.next(null); // LIMPIAMOS CACHE
    this.currentUserSignal.set(null);
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

      if (data.user) {
        const profile = this.mapUserToProfile(data.user, data.session?.access_token);
        this.currentUserSubject.next(profile); // ACTUALIZAMOS CACHE
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

  // Helper method for API headers
  private getHeaders(sessionToken?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    return headers;
  }

  // --- MÉTODOS PARA NODOS ---

  async getNodos(): Promise<{ data: Nodo[] | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/nodes`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener nodos.' } };
      }

      const data = await response.json();
      return { data: data as Nodo[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener nodos.', originalError: err } };
    }
  }

  async createNodo(nodo: Nodo): Promise<{ data: Nodo | null, error: AppError | null }> {
    try {
      const { data: sessionData } = await this.supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const response = await fetch(`${environment.apiUrl}/nodes`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(nodo),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al crear el nodo.' } };
      }

      const data = await response.json();
      return { data: data as Nodo, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al crear el nodo.', originalError: err } };
    }
  }

  async updateNodo(id: string, nodo: Partial<Nodo>): Promise<{ data: Nodo | null, error: AppError | null }> {
    try {
      const { data: sessionData } = await this.supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const response = await fetch(`${environment.apiUrl}/nodes/${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(token),
        body: JSON.stringify(nodo),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al actualizar el nodo.' } };
      }

      const data = await response.json();
      return { data: data as Nodo, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al actualizar el nodo.', originalError: err } };
    }
  }

  async deleteNodo(id: string): Promise<{ success: boolean, error: AppError | null }> {
    try {
      const { data: sessionData } = await this.supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const response = await fetch(`${environment.apiUrl}/nodes/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(token),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { success: false, error: { code: 'api/error', message: errData.message || 'Error al eliminar el nodo.' } };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: { code: 'api/unexpected', message: 'Error de red al eliminar el nodo.', originalError: err } };
    }
  }

  // --- MÉTODOS PARA PRODUCTOS ---

  async getProductos(): Promise<{ data: Producto[] | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/products`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener productos.' } };
      }

      const data = await response.json();
      return { data: data as Producto[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener productos.', originalError: err } };
    }
  }

  async createProducto(producto: Producto): Promise<{ data: Producto | null, error: AppError | null }> {
    try {
      const { data: sessionData } = await this.supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const response = await fetch(`${environment.apiUrl}/products`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(producto),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al crear el producto.' } };
      }

      const data = await response.json();
      return { data: data as Producto, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al crear el producto.', originalError: err } };
    }
  }

  async updateProducto(id: string, producto: Partial<Producto>): Promise<{ data: Producto | null, error: AppError | null }> {
    try {
      const { data: sessionData } = await this.supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const response = await fetch(`${environment.apiUrl}/products/${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(token),
        body: JSON.stringify(producto),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al editar el producto.' } };
      }

      const data = await response.json();
      return { data: data as Producto, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al editar el producto.', originalError: err } };
    }
  }

  async deleteProducto(id: string): Promise<{ success: boolean, error: AppError | null }> {
    try {
      const { data: sessionData } = await this.supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const response = await fetch(`${environment.apiUrl}/products/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(token),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { success: false, error: { code: 'api/error', message: errData.message || 'Error al eliminar el producto.' } };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: { code: 'api/unexpected', message: 'Error de red al eliminar el producto.', originalError: err } };
    }
  }
}

