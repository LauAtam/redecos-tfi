import { Injectable } from '@nestjs/common';
import { ProductsRepository } from './interfaces/products-repository.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async findAll() {
    return this.productsRepository.findAll();
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
}

