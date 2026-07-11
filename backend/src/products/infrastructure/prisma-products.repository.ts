import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductsRepository } from '../interfaces/products-repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class PrismaProductsRepository implements ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    onlyWithStock?: boolean;
  }): Promise<any> {
    const where: any = {};

    if (filters?.onlyWithStock) {
      where.stock = { gt: 0 };
    }

    if (filters?.categoryId) {
      where.category_id = filters.categoryId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.page && filters?.limit) {
      const skip = (filters.page - 1) * filters.limit;
      const take = filters.limit;
      const [items, total] = await Promise.all([
        this.prisma.productos.findMany({ 
          where, 
          skip, 
          take,
          include: { categories: true }
        }),
        this.prisma.productos.count({ where }),
      ]);
      return {
        items,
        total,
        page: Number(filters.page),
        limit: Number(filters.limit),
      };
    }

    return await this.prisma.productos.findMany({ 
      where,
      include: { categories: true }
    });
  }

  async findOne(id: string): Promise<any> {
    const product = await this.prisma.productos.findUnique({
      where: { id },
      include: { categories: true }
    });
    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<any> {
    return await this.prisma.productos.create({
      data: createProductDto as any,
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<any> {
    try {
      return await this.prisma.productos.update({
        where: { id },
        data: updateProductDto as any,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    try {
      await this.prisma.productos.delete({
        where: { id },
      });
      return { deleted: true };
    } catch (error: any) {
      if (error.code === 'P2025') {
        return { deleted: true };
      }
      throw error;
    }
  }

  async findCategories(): Promise<any[]> {
    return await this.prisma.categories.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
