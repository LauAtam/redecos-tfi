import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProfilesRepository } from './interfaces/profiles-repository.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MercadoPagoService } from '../buy-groups/infrastructure/mercado-pago.service';
import { MercadoPagoErrorMapper } from '../buy-groups/infrastructure/mercado-pago-error.mapper';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly mpService: MercadoPagoService,
  ) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return await this.profilesRepository.updateProfile(userId, dto);
  }

  async getProfile(userId: string) {
    const profile = await this.profilesRepository.findProfileById(userId);
    if (!profile) {
      throw new NotFoundException('El perfil de usuario no existe.');
    }
    return profile;
  }

  async listCards(userId: string): Promise<any[]> {
    return await this.profilesRepository.listCards(userId);
  }

  async addCard(userId: string, token: string): Promise<any> {
    const profile = await this.profilesRepository.findProfileById(userId);
    if (!profile) {
      throw new NotFoundException('El perfil de usuario no existe.');
    }

    let customerId = profile.customer_id;
    let mpCard;

    try {
      if (!customerId) {
        // Si el perfil no tiene customer_id en la base de datos, lo buscamos o creamos en Mercado Pago
        customerId = await this.mpService.getOrCreateCustomer(profile.email);
        // Guardar el customerId en el perfil del usuario en la base de datos
        await this.profilesRepository.updateProfile(userId, { customer_id: customerId } as any);
      }
      
      // Intentar guardar la tarjeta con el customerId existente
      mpCard = await this.mpService.saveCard(customerId, token);
    } catch (error: any) {
      // Si el cliente no existe en esta cuenta de Mercado Pago (p. ej. quedó un ID huérfano o de sandbox)
      if (error.message && error.message.includes('customer not found')) {
        console.log(`Customer ID ${customerId} no encontrado. Creando uno nuevo para ${profile.email}...`);
        customerId = await this.mpService.getOrCreateCustomer(profile.email);
        await this.profilesRepository.updateProfile(userId, { customer_id: customerId } as any);
        mpCard = await this.mpService.saveCard(customerId, token);
      } else {
        throw MercadoPagoErrorMapper.map(error.raw || error);
      }
    }

    // Guardar la tarjeta en la base de datos
    return await this.profilesRepository.addCard(userId, {
      card_id: mpCard.id,
      last_four: mpCard.last_four,
      brand: mpCard.brand,
      expiration_mo: mpCard.expiration_mo,
      expiration_yr: mpCard.expiration_yr,
    });
  }

  async deleteCard(userId: string, cardId: string): Promise<boolean> {
    const card = await this.profilesRepository.findCardById(cardId);
    if (!card) {
      throw new NotFoundException('La tarjeta no existe.');
    }

    if (card.profile_id !== userId) {
      throw new BadRequestException('Esta tarjeta no pertenece al usuario autenticado.');
    }

    const profile = await this.profilesRepository.findProfileById(userId);
    if (!profile) {
      throw new NotFoundException('El perfil de usuario no existe.');
    }

    // Si tiene customer_id, intentar borrar la tarjeta en Mercado Pago
    if (profile.customer_id) {
      await this.mpService.deleteCard(profile.customer_id, card.card_id);
    }

    // Borrar de la base de datos
    await this.profilesRepository.deleteCard(userId, cardId);
    return true;
  }
}
