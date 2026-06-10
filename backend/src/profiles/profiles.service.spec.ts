import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesService } from './profiles.service';
import { SupabaseService } from '../supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let supabaseService: SupabaseService;

  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    supabaseService = module.get<SupabaseService>(SupabaseService);

    // Reset mocks before each test
    jest.clearAllMocks();
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockReturnThis();
    mockSupabaseClient.update.mockReturnThis();
    mockSupabaseClient.eq.mockReturnThis();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateProfile', () => {
    const userId = 'user-uuid-123';

    it('should update profile successfully when default_node_id is provided and valid', async () => {
      const dto = {
        first_name: 'Juan',
        last_name: 'Perez',
        default_node_id: 'node-uuid-456',
      };
      const updatedProfile = { id: userId, ...dto };

      // Mock first query (select id from nodos) -> returns the node
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { id: dto.default_node_id }, error: null }) // check node exists
        .mockResolvedValueOnce({ data: updatedProfile, error: null }); // update profiles

      const result = await service.updateProfile(userId, dto);
      expect(result).toEqual(updatedProfile);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('nodos');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
    });

    it('should throw BadRequestException if default_node_id does not exist in database', async () => {
      const dto = {
        default_node_id: 'non-existent-node',
      };

      // Mock first query (select id from nodos) -> node not found
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { message: 'Not Found' } });

      await expect(service.updateProfile(userId, dto)).rejects.toThrow(
        new BadRequestException('El nodo de retiro no existe.'),
      );
    });

    it('should update profile successfully when default_node_id is not provided', async () => {
      const dto = {
        first_name: 'Juan',
        last_name: 'Perez',
      };
      const updatedProfile = { id: userId, ...dto, default_node_id: null };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: updatedProfile, error: null });

      const result = await service.updateProfile(userId, dto);
      expect(result).toEqual(updatedProfile);
      // It shouldn't query the 'nodos' table
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('nodos');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
    });

    it('should throw BadRequestException if profiles table update fails', async () => {
      const dto = {
        first_name: 'Juan',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { message: 'Update error' } });

      await expect(service.updateProfile(userId, dto)).rejects.toThrow(
        new BadRequestException('Update error'),
      );
    });
  });
});
