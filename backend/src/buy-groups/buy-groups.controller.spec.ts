import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BuyGroupsController } from './buy-groups.controller';
import { BuyGroupsService } from './buy-groups.service';
import { RolesGuard } from '../supabase/roles.guard';
import { Reflector } from '@nestjs/core';

describe('BuyGroupsController', () => {
  let controller: BuyGroupsController;
  let mockBuyGroupsService: any;

  beforeEach(async () => {
    mockBuyGroupsService = {
      getActiveGroups: jest.fn(),
      joinOrCreateGroup: jest.fn(),
      getMyOrders: jest.fn(),
    };

    const mockRolesGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuyGroupsController],
      providers: [
        { provide: BuyGroupsService, useValue: mockBuyGroupsService },
        { provide: Reflector, useValue: new Reflector() },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<BuyGroupsController>(BuyGroupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getActiveGroups', () => {
    it('should call service with nodeId', async () => {
      mockBuyGroupsService.getActiveGroups.mockResolvedValueOnce([]);

      const result = await controller.getActiveGroups('node-1');

      expect(mockBuyGroupsService.getActiveGroups).toHaveBeenCalledWith(
        'node-1',
      );
      expect(result).toEqual([]);
    });

    it('should throw BadRequestException if nodeId is missing', async () => {
      await expect(controller.getActiveGroups('')).rejects.toThrow(
        new BadRequestException('El parámetro nodeId es requerido.'),
      );
    });
  });

  describe('joinGroup', () => {
    it('should call service with user id and dto', async () => {
      const mockDto = { productId: 'prod-1', quantity: 3, nodeId: 'node-1' };
      mockBuyGroupsService.joinOrCreateGroup.mockResolvedValueOnce({
        id: 'order-1',
      });

      const mockReq = { user: { id: 'user-1' } };
      const result = await controller.joinGroup(mockReq, mockDto);

      expect(mockBuyGroupsService.joinOrCreateGroup).toHaveBeenCalledWith(
        'user-1',
        mockDto,
      );
      expect(result.id).toBe('order-1');
    });
  });

  describe('getMyOrders', () => {
    it('should call service with user id from req', async () => {
      mockBuyGroupsService.getMyOrders.mockResolvedValueOnce([]);

      const mockReq = { user: { id: 'user-1' } };
      const result = await controller.getMyOrders(mockReq);

      expect(mockBuyGroupsService.getMyOrders).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([]);
    });
  });
});
