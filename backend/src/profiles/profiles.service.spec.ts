import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesService } from './profiles.service';
import { ProfilesRepository } from './interfaces/profiles-repository.interface';
import { MercadoPagoService } from '../buy-groups/infrastructure/mercado-pago.service';
import { BadRequestException } from '@nestjs/common';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let repository: ProfilesRepository;

  const mockProfilesRepository = {
    updateProfile: jest.fn(),
    findProfileById: jest.fn(),
    addCard: jest.fn(),
    listCards: jest.fn(),
    deleteCard: jest.fn(),
    findCardById: jest.fn(),
  };

  const mockMercadoPagoService = {
    getOrCreateCustomer: jest.fn(),
    saveCard: jest.fn(),
    deleteCard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: ProfilesRepository,
          useValue: mockProfilesRepository,
        },
        {
          provide: MercadoPagoService,
          useValue: mockMercadoPagoService,
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

  describe('listCards', () => {
    it('should return repository listCards', async () => {
      const userId = 'user-uuid-123';
      const mockCards = [{ id: 'card-1', brand: 'visa' }];
      mockProfilesRepository.listCards.mockResolvedValueOnce(mockCards);

      const result = await service.listCards(userId);
      expect(result).toBe(mockCards);
      expect(mockProfilesRepository.listCards).toHaveBeenCalledWith(userId);
    });
  });

  describe('addCard', () => {
    const userId = 'user-uuid-123';
    const cardToken = 'tok-123';

    it('should get customer, save card in MP and then save locally', async () => {
      const mockProfile = { id: userId, email: 'juan@example.com', customer_id: 'cust-123' };
      const mockMpCard = { id: 'mp-card-1', last_four: '1234', brand: 'visa', expiration_mo: 12, expiration_yr: 2030 };
      const mockDbCard = { id: 'db-card-1', ...mockMpCard };

      mockProfilesRepository.findProfileById.mockResolvedValueOnce(mockProfile);
      mockMercadoPagoService.saveCard.mockResolvedValueOnce(mockMpCard);
      mockProfilesRepository.addCard.mockResolvedValueOnce(mockDbCard);

      const result = await service.addCard(userId, cardToken);
      expect(result).toBe(mockDbCard);
      expect(mockProfilesRepository.findProfileById).toHaveBeenCalledWith(userId);
      expect(mockMercadoPagoService.saveCard).toHaveBeenCalledWith('cust-123', cardToken);
      expect(mockProfilesRepository.addCard).toHaveBeenCalledWith(userId, {
        card_id: mockMpCard.id,
        last_four: mockMpCard.last_four,
        brand: mockMpCard.brand,
        expiration_mo: mockMpCard.expiration_mo,
        expiration_yr: mockMpCard.expiration_yr,
      });
    });

    it('should create customer first if profile has no customer_id', async () => {
      const mockProfile = { id: userId, email: 'juan@example.com', customer_id: null };
      const mockMpCard = { id: 'mp-card-1', last_four: '1234', brand: 'visa', expiration_mo: 12, expiration_yr: 2030 };
      const mockDbCard = { id: 'db-card-1', ...mockMpCard };

      mockProfilesRepository.findProfileById.mockResolvedValueOnce(mockProfile);
      mockMercadoPagoService.getOrCreateCustomer.mockResolvedValueOnce('cust-new-123');
      mockProfilesRepository.updateProfile.mockResolvedValueOnce({});
      mockMercadoPagoService.saveCard.mockResolvedValueOnce(mockMpCard);
      mockProfilesRepository.addCard.mockResolvedValueOnce(mockDbCard);

      const result = await service.addCard(userId, cardToken);
      expect(result).toBe(mockDbCard);
      expect(mockMercadoPagoService.getOrCreateCustomer).toHaveBeenCalledWith('juan@example.com');
      expect(mockProfilesRepository.updateProfile).toHaveBeenCalledWith(userId, { customer_id: 'cust-new-123' });
    });
  });

  describe('deleteCard', () => {
    const userId = 'user-uuid-123';
    const cardId = 'db-card-1';

    it('should delete from MP and locally if card belongs to user', async () => {
      const mockCard = { id: cardId, profile_id: userId, card_id: 'mp-card-1' };
      const mockProfile = { id: userId, customer_id: 'cust-123' };

      mockProfilesRepository.findCardById.mockResolvedValueOnce(mockCard);
      mockProfilesRepository.findProfileById.mockResolvedValueOnce(mockProfile);
      mockMercadoPagoService.deleteCard.mockResolvedValueOnce(true);
      mockProfilesRepository.deleteCard.mockResolvedValueOnce({});

      const result = await service.deleteCard(userId, cardId);
      expect(result).toBe(true);
      expect(mockMercadoPagoService.deleteCard).toHaveBeenCalledWith('cust-123', 'mp-card-1');
      expect(mockProfilesRepository.deleteCard).toHaveBeenCalledWith(userId, cardId);
    });
  });
});
