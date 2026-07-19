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

  async generateWithdrawalOtp(): Promise<{ data: any | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/nodes/generate-withdrawal-otp`, {
        method: 'POST',
        headers: await this.authService.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al generar código de retiro.' } };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al generar código de retiro.', originalError: err } };
    }
  }

  async getClientPendingOrders(profileId: string): Promise<{ data: any[] | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/nodes/client-orders/${profileId}`, {
        method: 'GET',
        headers: await this.authService.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener pedidos del cliente.' } };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener pedidos del cliente.', originalError: err } };
    }
  }

  async confirmDelivery(dto: { profileId: string, otp: string, orderIds: string[] }): Promise<{ data: any | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/nodes/confirm-delivery`, {
        method: 'POST',
        headers: await this.authService.getHeaders(),
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al confirmar entrega.' } };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al confirmar entrega.', originalError: err } };
    }
  }
}
