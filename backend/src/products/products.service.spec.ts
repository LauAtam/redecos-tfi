import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { ProductsRepository } from './interfaces/products-repository.interface';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: ProductsRepository;

  const mockProductsRepository = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductsRepository,
          useValue: mockProductsRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get<ProductsRepository>(ProductsRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const result = [{ id: '1', name: 'Product 1' }];
      mockProductsRepository.findAll.mockResolvedValueOnce(result);

      expect(await service.findAll()).toBe(result);
      expect(mockProductsRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      const result = { id: '1', name: 'Product 1' };
      mockProductsRepository.findOne.mockResolvedValueOnce(result);

      expect(await service.findOne('1')).toBe(result);
      expect(mockProductsRepository.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductsRepository.findOne.mockRejectedValueOnce(new NotFoundException());

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const dto = { name: 'New Product', price: 100, bulk_size: 10 };
      const result = { id: '1', ...dto };
      mockProductsRepository.create.mockResolvedValueOnce(result);

      expect(await service.create(dto)).toBe(result);
      expect(mockProductsRepository.create).toHaveBeenCalledWith(dto);
    });
  });
});
