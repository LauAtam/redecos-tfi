import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BuyGroupsService } from './buy-groups.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('BuyGroupsService', () => {
  let service: BuyGroupsService;
  let mockSupabaseService: any;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn(),
    };

    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
      getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyGroupsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<BuyGroupsService>(BuyGroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveGroups', () => {
    it('should query active buy groups at a node and return mapped statistics', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          product_id: 'prod-1',
          node_id: 'node-1',
          status: 'OPEN',
          target_size: 10,
          created_at: '2026-06-11T00:00:00Z',
          closed_at: null,
          product: {
            id: 'prod-1',
            name: 'Yerba 1kg',
            price: 2000,
            bulk_size: 10,
          },
          orders: [
            { quantity: 3, status: 'CONFIRMED' },
            { quantity: 5, status: 'CONFIRMED' },
          ],
        },
      ];

      mockSupabaseClient.then.mockImplementationOnce((resolve) =>
        resolve({ data: mockGroups, error: null }),
      );

      const result = await service.getActiveGroups('node-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('buy_groups');
      expect(result.length).toBe(1);
      expect(result[0].unitsBought).toBe(8);
      expect(result[0].unitsLeft).toBe(2);
      expect(result[0].progress).toBe(80);
    });

    it('should throw BadRequestException on database error', async () => {
      mockSupabaseClient.then.mockImplementationOnce((resolve) =>
        resolve({ data: null, error: { message: 'Database error' } }),
      );

      await expect(service.getActiveGroups('node-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('joinOrCreateGroup', () => {
    const mockJoinDto = {
      productId: 'prod-1',
      quantity: 2,
      nodeId: 'node-1',
    };

    it('should join an existing group successfully', async () => {
      // 1. Mock product query
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { price: 2000, bulk_size: 10 },
        error: null,
      });

      // 2. Mock node query
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'node-1' },
        error: null,
      });

      // 3. Mock active group query
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { id: 'group-1' },
        error: null,
      });

      // 4. Mock group order insert
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'order-1', group_id: 'group-1', quantity: 2 },
        error: null,
      });

      // 5. Mock group orders check (sum is 2, bulk_size is 10, so not completed)
      mockSupabaseClient.then.mockImplementationOnce((resolve) =>
        resolve({ data: [{ quantity: 2 }], error: null }),
      );

      const result = await service.joinOrCreateGroup('user-1', mockJoinDto);

      expect(result.id).toBe('order-1');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          group_id: 'group-1',
          profile_id: 'user-1',
          quantity: 2,
          unit_price: 2000,
        }),
      );
    });

    it('should mark group as CLOSED when target size is reached', async () => {
      // 1. Mock product query
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { price: 2000, bulk_size: 10 },
        error: null,
      });

      // 2. Mock node query
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'node-1' },
        error: null,
      });

      // 3. Mock active group query
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { id: 'group-1' },
        error: null,
      });

      // 4. Mock group order insert
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'order-1', group_id: 'group-1', quantity: 2 },
        error: null,
      });

      // 5. Mock group orders check (sum is 10, bulk_size is 10, so CLOSED)
      mockSupabaseClient.then.mockImplementationOnce((resolve) =>
        resolve({ data: [{ quantity: 8 }, { quantity: 2 }], error: null }),
      );

      // 6. Mock update query
      mockSupabaseClient.then.mockImplementationOnce((resolve) =>
        resolve({ data: null, error: null }),
      );

      const result = await service.joinOrCreateGroup('user-1', mockJoinDto);

      expect(result.id).toBe('order-1');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'CLOSED',
          closed_at: expect.any(String),
        }),
      );
    });

    it('should throw exception if product does not exist', async () => {
      // 1. Mock product query (not found)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });
      // 2. Mock node query (found)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'node-1' },
        error: null,
      });
      // 3. Mock active group query
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.joinOrCreateGroup('user-1', mockJoinDto),
      ).rejects.toThrow(new BadRequestException('El producto no existe.'));
    });

    it('should throw exception if node does not exist', async () => {
      // 1. Mock product query (found)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { price: 2000, bulk_size: 10 },
        error: null,
      });
      // 2. Mock node query (not found)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });
      // 3. Mock active group query
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.joinOrCreateGroup('user-1', mockJoinDto),
      ).rejects.toThrow(
        new BadRequestException('El punto de retiro no existe.'),
      );
    });
  });

  describe('getMyOrders', () => {
    it('should return user orders successfully', async () => {
      const mockOrders = [{ id: 'order-1', group_id: 'group-1', quantity: 3 }];
      mockSupabaseClient.order.mockResolvedValueOnce({
        data: mockOrders,
        error: null,
      });

      const result = await service.getMyOrders('user-1');
      expect(result).toEqual(mockOrders);
    });
  });
});
