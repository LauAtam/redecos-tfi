import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: ProfilesService;

  const mockProfilesService = {
    updateProfile: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://mock-supabase.url'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
    service = module.get<ProfilesService>(ProfilesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateProfile', () => {
    it('should call service with req.user.id and body', async () => {
      const userId = 'user-uuid-123';
      const req = { user: { id: userId, email: 'juan@example.com', role: 'CLIENTE' } };
      const dto: UpdateProfileDto = {
        first_name: 'Juan',
        last_name: 'Perez',
        default_node_id: 'node-uuid-456',
      };

      const expectedResponse = { id: userId, ...dto };
      mockProfilesService.updateProfile.mockResolvedValueOnce(expectedResponse);

      const result = await controller.updateProfile(req as any, dto);
      expect(result).toBe(expectedResponse);
      expect(service.updateProfile).toHaveBeenCalledWith(userId, dto);
    });
  });
});
