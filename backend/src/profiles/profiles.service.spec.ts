import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesService } from './profiles.service';
import { ProfilesRepository } from './interfaces/profiles-repository.interface';
import { BadRequestException } from '@nestjs/common';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let repository: ProfilesRepository;

  const mockProfilesRepository = {
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: ProfilesRepository,
          useValue: mockProfilesRepository,
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    repository = module.get<ProfilesRepository>(ProfilesRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateProfile', () => {
    const userId = 'user-uuid-123';

    it('should delegate to repository and return updated profile', async () => {
      const dto = {
        first_name: 'Juan',
        last_name: 'Perez',
        default_node_id: 'node-uuid-456',
      };
      const updatedProfile = { id: userId, ...dto };

      mockProfilesRepository.updateProfile.mockResolvedValueOnce(updatedProfile);

      const result = await service.updateProfile(userId, dto);
      expect(result).toEqual(updatedProfile);
      expect(mockProfilesRepository.updateProfile).toHaveBeenCalledWith(userId, dto);
    });

    it('should propagate exceptions from repository', async () => {
      const dto = {
        default_node_id: 'non-existent-node',
      };

      mockProfilesRepository.updateProfile.mockRejectedValueOnce(
        new BadRequestException('El nodo de retiro no existe.'),
      );

      await expect(service.updateProfile(userId, dto)).rejects.toThrow(
        new BadRequestException('El nodo de retiro no existe.'),
      );
    });
  });
});
