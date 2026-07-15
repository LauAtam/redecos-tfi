import { PrismaClient } from '@prisma/client';
import { PrismaProductsRepository } from '../src/products/infrastructure/prisma-products.repository';

async function main() {
  const prisma = new PrismaClient();
  const repository = new PrismaProductsRepository(prisma as any);

  console.log('Fetching products with findAll({ page: 1, limit: 20 })...');
  try {
    const result = await repository.findAll({
      page: 1,
      limit: 20,
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error fetching products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
