import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

export abstract class ProductsRepository {
  abstract findAll(): Promise<any[]>;
  abstract findOne(id: string): Promise<any>;
  abstract create(createProductDto: CreateProductDto): Promise<any>;
  abstract update(id: string, updateProductDto: UpdateProductDto): Promise<any>;
  abstract remove(id: string): Promise<{ deleted: boolean }>;
}
