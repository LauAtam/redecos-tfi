import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductsRepository } from '../interfaces/products-repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class PrismaProductsRepository implements ProductsRepository {
  constructor(private readonly prisma: PrismaService) { }

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

  async bulkUpsert(
    products: any[],
  ): Promise<{ importedCount: number; categoriesCreated: number }> {
    let categoriesCreated = 0;
    let importedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      // 1. Obtener todas las categorías para mapear en memoria
      const existingCategories = await tx.categories.findMany();
      const categoryMap = new Map<string, string>();
      existingCategories.forEach((c) => {
        categoryMap.set(c.name.toLowerCase().trim(), c.id);
      });

      // 2. Pre-crear de forma secuencial las categorías que falten para evitar race conditions
      for (const prod of products) {
        const catNameNorm = prod.category.toLowerCase().trim();
        let categoryId = categoryMap.get(catNameNorm);

        if (!categoryId) {
          const newCat = await tx.categories.create({
            data: { name: prod.category.trim() },
          });
          categoryId = newCat.id;
          categoryMap.set(catNameNorm, categoryId);
          categoriesCreated++;
        }
      }

      // 3. Obtener todos los productos para mapear en memoria
      const existingProducts = await tx.productos.findMany();
      const productMap = new Map<string, string>();
      existingProducts.forEach((p) => {
        productMap.set(p.name.toLowerCase().trim(), p.id);
      });

      const newProductsData: any[] = [];
      const productsToUpdate: { id: string; data: any }[] = [];

      // 4. Clasificar los productos en "nuevos" (crear) o "existentes" (actualizar)
      for (const prod of products) {
        const categoryId = categoryMap.get(prod.category.toLowerCase().trim())!;
        const prodNameNorm = prod.name.toLowerCase().trim();
        const existingProductId = productMap.get(prodNameNorm);

        const productData = {
          name: prod.name.trim(),
          description: prod.description ? prod.description.trim() : null,
          price: prod.price,
          bulk_size: prod.bulk_size,
          image_url: prod.image_url ? prod.image_url.trim() : null,
          retail_price: prod.retail_price,
          category_id: categoryId,
          stock: prod.stock,
        };

        if (existingProductId) {
          productsToUpdate.push({ id: existingProductId, data: productData });
        } else {
          newProductsData.push(productData);
        }
      }

      // 5. Insertar todos los nuevos de un solo tirón usando createMany (1 sola consulta SQL!)
      if (newProductsData.length > 0) {
        await tx.productos.createMany({
          data: newProductsData,
        });
        importedCount += newProductsData.length;
      }

      // 6. Actualizar los existentes de forma concurrente en lotes
      if (productsToUpdate.length > 0) {
        const batchSize = 40;
        for (let i = 0; i < productsToUpdate.length; i += batchSize) {
          const batch = productsToUpdate.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (item) => {
              await tx.productos.update({
                where: { id: item.id },
                data: item.data,
              });
              importedCount++;
            })
          );
        }
      }
    }, {
      maxWait: 15000,  // 15 segundos para adquirir conexión del pooler
      timeout: 30000,  // 30 segundos son más que suficientes con createMany!
    });

    return { importedCount, categoriesCreated };
  }
}
