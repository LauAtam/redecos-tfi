import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BuyGroup, GroupOrder, AppError } from '../models/auth.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class BuyGroupService {
  private authService = inject(AuthService);

  async getActiveBuyGroups(nodeId: string): Promise<{ data: BuyGroup[] | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/buy-groups/active?nodeId=${nodeId}`, {
        method: 'GET',
        headers: await this.authService.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener los grupos de compra activos.' } };
      }

      const data = await response.json();
      return { data: data as BuyGroup[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener grupos de compra.', originalError: err } };
    }
  }

  async joinOrCreateBuyGroup(dto: {
    productId: string;
    quantity: number;
    nodeId: string;
    paymentToken: string;
    paymentMethodId: string;
    cardholderEmail: string;
  }): Promise<{ data: GroupOrder | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/buy-groups/join`, {
        method: 'POST',
        headers: await this.authService.getHeaders(),
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al unirse al grupo de compra.' } };
      }

      const data = await response.json();
      return { data: data as GroupOrder, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al unirse al grupo de compra.', originalError: err } };
    }
  }

  async getMyOrders(): Promise<{ data: GroupOrder[] | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/buy-groups/my-orders`, {
        method: 'GET',
        headers: await this.authService.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener tus pedidos.' } };
      }

      const data = await response.json();
      return { data: data as GroupOrder[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener pedidos.', originalError: err } };
    }
  }

  async listBuyGroups(filters?: { status?: string; nodeId?: string; productId?: string }): Promise<{ data: BuyGroup[] | null, error: AppError | null }> {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.nodeId) queryParams.append('nodeId', filters.nodeId);
        if (filters.productId) queryParams.append('productId', filters.productId);
      }

      const url = `${environment.apiUrl}/buy-groups${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: await this.authService.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al listar los grupos de compra.' } };
      }

      const data = await response.json();
      return { data: data as BuyGroup[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al listar los grupos de compra.', originalError: err } };
    }
  }

  async updateBuyGroupStatus(id: string, status: string): Promise<{ data: BuyGroup | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/buy-groups/${id}/status`, {
        method: 'PATCH',
        headers: await this.authService.getHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al actualizar el estado del grupo.' } };
      }

      const data = await response.json();
      return { data: data as BuyGroup, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al actualizar el estado del grupo.', originalError: err } };
    }
  }

  async consolidateBuyGroups(dto: {
    nodeId: string;
    groupIds?: string[];
  }): Promise<{ data: any | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/buy-groups/consolidate`, {
        method: 'POST',
        headers: await this.authService.getHeaders(),
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al consolidar los grupos de compra.' } };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al consolidar grupos de compra.', originalError: err } };
    }
  }
}
