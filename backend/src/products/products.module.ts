import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProductsRepository } from './interfaces/products-repository.interface';
import { SupabaseProductsRepository } from './infrastructure/supabase-products.repository';

@Module({
  imports: [SupabaseModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    {
      provide: ProductsRepository,
      useClass: SupabaseProductsRepository,
    },
  ],
})
export class ProductsModule {}
