import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AppError } from '../models/auth.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class StatsService {
  private authService = inject(AuthService);

  async getNodeDashboardStats(nodeId: string): Promise<{ data: any | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/nodes/${nodeId}/dashboard-stats`, {
        method: 'GET',
        headers: await this.authService.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener estadísticas del nodo.' } };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener estadísticas del nodo.', originalError: err } };
    }
  }

  async getAdminDashboardStats(): Promise<{ data: any | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/admin/dashboard-stats`, {
        method: 'GET',
        headers: await this.authService.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener estadísticas del administrador.' } };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener estadísticas del administrador.', originalError: err } };
    }
  }

  async getClientSavingsStats(): Promise<{ data: any | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/profiles/me/savings-stats`, {
        method: 'GET',
        headers: await this.authService.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener estadísticas de ahorro.' } };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener estadísticas de ahorro.', originalError: err } };
    }
  }
}
