import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductsRepository } from '../interfaces/products-repository.interface';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class SupabaseProductsRepository implements ProductsRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(filters?: {
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const client = this.supabaseService.getAdminClient();
    let query = client.from('productos').select('*', { count: 'exact' });

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      );
    }

    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    if (filters?.page && filters?.limit) {
      return {
        items: data || [],
        total: count || 0,
        page: Number(filters.page),
        limit: Number(filters.limit),
      };
    }

    return data || [];
  }

  async findOne(id: string): Promise<any> {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException(`Product with ID ${id} not found`);
    return data;
  }

  async create(createProductDto: CreateProductDto): Promise<any> {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('productos')
      .insert(createProductDto)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<any> {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('productos')
      .update(updateProductDto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client.from('productos').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }

  async findCategories(): Promise<any[]> {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data;
  }
}
