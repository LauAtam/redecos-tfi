import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Producto, Categoria, AppError } from '../models/auth.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private authService = inject(AuthService);

  async getProductos(filters?: { search?: string; categoryId?: string; page?: number; limit?: number }): Promise<{ data: Producto[] | null, error: AppError | null }> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.categoryId) queryParams.append('categoryId', filters.categoryId);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const url = queryParams.toString()
        ? `${environment.apiUrl}/products?${queryParams.toString()}`
        : `${environment.apiUrl}/products`;

      const response = await fetch(url, {
        method: 'GET',
        headers: await this.authService.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener productos.' } };
      }

      const data = await response.json();
      const productsList = Array.isArray(data) ? data : (data.items || []);
      return { data: productsList as Producto[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener productos.', originalError: err } };
    }
  }

  async getCategorias(): Promise<{ data: Categoria[] | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/products/categories`, {
        method: 'GET',
        headers: await this.authService.getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al obtener categorías.' } };
      }

      const data = await response.json();
      return { data: data as Categoria[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al obtener categorías.', originalError: err } };
    }
  }

  async createProducto(producto: Producto): Promise<{ data: Producto | null, error: AppError | null }> {
    try {
      const response = await fetch(`${environment.apiUrl}/products`, {
        method: 'POST',
        headers: await this.authService.getHeaders(),
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
      const response = await fetch(`${environment.apiUrl}/products/${id}`, {
        method: 'PATCH',
        headers: await this.authService.getHeaders(),
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
      const response = await fetch(`${environment.apiUrl}/products/${id}`, {
        method: 'DELETE',
        headers: await this.authService.getHeaders(),
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

  async importCatalog(file: File): Promise<{ data: { importedCount: number; categoriesCreated: number } | null, error: AppError | null }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Obtenemos los headers estándar de auth para extraer el token Bearer
      const authHeaders = await this.authService.getHeaders() as any;
      const headers: Record<string, string> = {};
      if (authHeaders && authHeaders['Authorization']) {
        headers['Authorization'] = authHeaders['Authorization'];
      }

      const response = await fetch(`${environment.apiUrl}/products/import`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        return { data: null, error: { code: 'api/error', message: errData.message || 'Error al importar catálogo.' } };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { code: 'api/unexpected', message: 'Error de red al importar catálogo.', originalError: err } };
    }
  }
}
