import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let supabaseService: SupabaseService;

  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const result = [{ id: '1', name: 'Product 1' }];
      mockSupabaseClient.select.mockResolvedValueOnce({ data: result, error: null });

      expect(await service.findAll()).toBe(result);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('productos');
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      const result = { id: '1', name: 'Product 1' };
      mockSupabaseClient.single.mockResolvedValueOnce({ data: result, error: null });

      expect(await service.findOne('1')).toBe(result);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: new Error('Not Found') });

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const dto = { name: 'New Product', price: 100, bulk_size: 10 };
      const result = { id: '1', ...dto };
      mockSupabaseClient.single.mockResolvedValueOnce({ data: result, error: null });

      expect(await service.create(dto)).toBe(result);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(dto);
    });
  });
});
