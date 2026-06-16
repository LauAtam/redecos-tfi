import { Test, TestingModule } from '@nestjs/testing';
import { NodesService } from './nodes.service';
import { NodesRepository } from './interfaces/nodes-repository.interface';
import { NotFoundException } from '@nestjs/common';

describe('NodesService', () => {
  let service: NodesService;
  let repository: NodesRepository;

  const mockNodesRepository = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        {
          provide: NodesRepository,
          useValue: mockNodesRepository,
        },
      ],
    }).compile();

    service = module.get<NodesService>(NodesService);
    repository = module.get<NodesRepository>(NodesRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of nodes', async () => {
      const result = [{ id: '1', name: 'Node 1' }];
      mockNodesRepository.findAll.mockResolvedValueOnce(result);

      expect(await service.findAll()).toBe(result);
      expect(mockNodesRepository.findAll).toHaveBeenCalled();
    });

    it('should throw error if repository returns error', async () => {
      mockNodesRepository.findAll.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.findAll()).rejects.toThrow('DB Error');
    });
  });

  describe('findOne', () => {
    it('should return a single node', async () => {
      const result = { id: '1', name: 'Node 1' };
      mockNodesRepository.findOne.mockResolvedValueOnce(result);

      expect(await service.findOne('1')).toBe(result);
      expect(mockNodesRepository.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if node not found', async () => {
      mockNodesRepository.findOne.mockRejectedValueOnce(
        new NotFoundException(),
      );

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new node', async () => {
      const dto = { name: 'New Node', address: 'Addr', manager_name: 'Mgr' };
      const result = { id: '1', ...dto };
      mockNodesRepository.create.mockResolvedValueOnce(result);

      expect(await service.create(dto)).toBe(result);
      expect(mockNodesRepository.create).toHaveBeenCalledWith(dto);
    });
  });
});
