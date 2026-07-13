import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Nodo, AppError } from '../models/auth.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class NodeService {
  private authService = inject(AuthService);

  async getNodos(): Promise<{ data: Nodo[] | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/nodes`, {
        method: 'GET',
        headers: await this.authService.getHeaders(),
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
      const response = await fetch(`${environment.apiUrl}/nodes`, {
        method: 'POST',
        headers: await this.authService.getHeaders(),
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
      const response = await fetch(`${environment.apiUrl}/nodes/${id}`, {
        method: 'PATCH',
        headers: await this.authService.getHeaders(),
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
      const response = await fetch(`${environment.apiUrl}/nodes/${id}`, {
        method: 'DELETE',
        headers: await this.authService.getHeaders(),
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
}
