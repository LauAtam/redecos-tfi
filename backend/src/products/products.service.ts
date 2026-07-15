import { Injectable } from '@nestjs/common';
import { ProductsRepository } from './interfaces/products-repository.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) { }

  async findAll(filters?: {
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    onlyWithStock?: boolean;
  }) {
    return this.productsRepository.findAll(filters);
  }

  async findOne(id: string) {
    return this.productsRepository.findOne(id);
  }

  async create(createProductDto: CreateProductDto) {
    return this.productsRepository.create(createProductDto);
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    return this.productsRepository.update(id, updateProductDto);
  }

  async remove(id: string) {
    return this.productsRepository.remove(id);
  }

  async findCategories() {
    return this.productsRepository.findCategories();
  }

  async importFromCsv(fileBuffer: Buffer) {
    const csvContent = fileBuffer.toString('utf-8');
    const products = this.parseCsv(csvContent);
    return this.productsRepository.bulkUpsert(products);
  }

  private parseCsv(csvText: string): any[] {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue);
        currentValue = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentValue);
        lines.push(row);
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    if (row.length > 0 || currentValue) {
      row.push(currentValue);
      lines.push(row);
    }

    if (lines.length === 0) return [];

    const headers = lines[0].map((h) => h.trim());

    const categoryIdx = headers.indexOf('Categoria');
    const nameIdx = headers.indexOf('Nombre_Producto');
    const descIdx = headers.indexOf('Descripcion');
    const priceIdx = headers.indexOf('Precio_Mayorista');
    const bulkIdx = headers.indexOf('Tamano_Bulto');
    const imgIdx = headers.indexOf('URL_Imagen');
    const retailIdx = headers.indexOf('Precio_Minorista');
    const stockIdx = headers.indexOf('Stock');

    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length <= 1 && !line[0]) continue;

      const name = line[nameIdx] || '';
      if (!name.trim()) continue;

      const category = line[categoryIdx] || 'General';
      const description = line[descIdx] || null;
      const priceRaw = line[priceIdx] || '0.00';
      const bulkRaw = line[bulkIdx] || '1';
      const imageUrl = line[imgIdx] || null;
      const retailRaw = line[retailIdx] || null;
      const stockRaw = line[stockIdx] || '0';

      const price = parseFloat(priceRaw) || 0.00;
      const bulk_size = parseInt(bulkRaw, 10) || 1;
      const retail_price = retailRaw && retailRaw.trim() ? parseFloat(retailRaw) : null;
      const stock = parseInt(stockRaw, 10) || 0;

      result.push({
        category,
        name,
        description,
        price,
        bulk_size,
        image_url: imageUrl,
        retail_price,
        stock,
      });
    }

    return result;
  }
}
