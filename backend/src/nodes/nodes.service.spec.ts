import { Test, TestingModule } from '@nestjs/testing';
import { NodesService } from './nodes.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotFoundException } from '@nestjs/common';

describe('NodesService', () => {
  let service: NodesService;
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
        NodesService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
      ],
    }).compile();

    service = module.get<NodesService>(NodesService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of nodes', async () => {
      const result = [{ id: '1', name: 'Node 1' }];
      mockSupabaseClient.select.mockResolvedValueOnce({ data: result, error: null });

      expect(await service.findAll()).toBe(result);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('nodos');
    });

    it('should throw error if supabase returns error', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({ data: null, error: new Error('DB Error') });

      await expect(service.findAll()).rejects.toThrow('DB Error');
    });
  });

  describe('findOne', () => {
    it('should return a single node', async () => {
      const result = { id: '1', name: 'Node 1' };
      mockSupabaseClient.single.mockResolvedValueOnce({ data: result, error: null });

      expect(await service.findOne('1')).toBe(result);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should throw NotFoundException if node not found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: new Error('Not Found') });

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new node', async () => {
      const dto = { name: 'New Node', address: 'Addr', manager_name: 'Mgr' };
      const result = { id: '1', ...dto };
      mockSupabaseClient.single.mockResolvedValueOnce({ data: result, error: null });

      expect(await service.create(dto)).toBe(result);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(dto);
    });
  });
});
