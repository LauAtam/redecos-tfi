import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaProductsRepository } from '../src/products/infrastructure/prisma-products.repository';
import { ProductsService } from '../src/products/products.service';

async function main() {
  console.log('Initializing Prisma Client...');
  const prisma = new PrismaClient();
  
  console.log('Instantiating service and repository...');
  const repository = new PrismaProductsRepository(prisma as any);
  const service = new ProductsService(repository);

  const csvPath = path.join(__dirname, '../../davelcor_catalogo.csv');
  console.log(`Reading CSV from: ${csvPath}`);
  
  try {
    const fileBuffer = fs.readFileSync(csvPath);
    console.log('Running importFromCsv...');
    const result = await service.importFromCsv(fileBuffer);
    console.log('Import successful! Result:', result);
  } catch (error) {
    console.error('Import failed! Error details:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
