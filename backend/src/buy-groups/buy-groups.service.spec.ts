import { Test, TestingModule } from '@nestjs/testing';
import { BuyGroupsService } from './buy-groups.service';
import { BuyGroupsRepository } from './interfaces/buy-groups-repository.interface';
import { JoinGroupDto } from './dto/join-group.dto';
import { BadRequestException } from '@nestjs/common';

describe('BuyGroupsService', () => {
  let service: BuyGroupsService;
  let repository: BuyGroupsRepository;

  const mockBuyGroupsRepository = {
    getActiveGroups: jest.fn(),
    joinOrCreateGroup: jest.fn(),
    getMyOrders: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyGroupsService,
        {
          provide: BuyGroupsRepository,
          useValue: mockBuyGroupsRepository,
        },
      ],
    }).compile();

    service = module.get<BuyGroupsService>(BuyGroupsService);
    repository = module.get<BuyGroupsRepository>(BuyGroupsRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveGroups', () => {
    it('should delegate to repository', async () => {
      const nodeId = 'node-123';
      const expectedResult = [{ id: 'group-1' }];
      mockBuyGroupsRepository.getActiveGroups.mockResolvedValueOnce(expectedResult);

      const result = await service.getActiveGroups(nodeId);
      expect(result).toEqual(expectedResult);
      expect(mockBuyGroupsRepository.getActiveGroups).toHaveBeenCalledWith(nodeId);
    });
  });

  describe('joinOrCreateGroup', () => {
    it('should delegate to repository', async () => {
      const userId = 'user-123';
      const dto: JoinGroupDto = { productId: 'prod-1', nodeId: 'node-1', quantity: 2 };
      const expectedResult = { id: 'order-1' };
      
      mockBuyGroupsRepository.joinOrCreateGroup.mockResolvedValueOnce(expectedResult);

      const result = await service.joinOrCreateGroup(userId, dto);
      expect(result).toEqual(expectedResult);
      expect(mockBuyGroupsRepository.joinOrCreateGroup).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('getMyOrders', () => {
    it('should delegate to repository', async () => {
      const userId = 'user-123';
      const expectedResult = [{ id: 'order-1' }];
      mockBuyGroupsRepository.getMyOrders.mockResolvedValueOnce(expectedResult);

      const result = await service.getMyOrders(userId);
      expect(result).toEqual(expectedResult);
      expect(mockBuyGroupsRepository.getMyOrders).toHaveBeenCalledWith(userId);
    });
  });
});
