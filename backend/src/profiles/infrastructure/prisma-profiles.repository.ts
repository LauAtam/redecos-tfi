import { Injectable, BadRequestException } from '@nestjs/common';
import { ProfilesRepository } from '../interfaces/profiles-repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class PrismaProfilesRepository implements ProfilesRepository {
  constructor(private readonly prisma: PrismaService) { }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<any> {
    try {
      // Si se proporciona default_node_id, verificamos que exista primero
      // para lanzar el error específico de "no existe" igual que antes.
      if (updateProfileDto.default_node_id) {
        const node = await this.prisma.nodos.findUnique({
          where: { id: updateProfileDto.default_node_id },
        });
        if (!node) {
          throw new BadRequestException('El nodo de retiro no existe.');
        }
      }

      return await this.prisma.profiles.update({
        where: { id: userId },
        data: updateProfileDto as any,
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async findProfileById(userId: string): Promise<any> {
    return await this.prisma.profiles.findUnique({
      where: { id: userId },
    });
  }

  async addCard(
    userId: string,
    card: { card_id: string; last_four: string; brand: string; expiration_mo: number; expiration_yr: number },
  ): Promise<any> {
    return await this.prisma.user_cards.create({
      data: {
        profile_id: userId,
        card_id: card.card_id,
        last_four: card.last_four,
        brand: card.brand,
        expiration_mo: card.expiration_mo,
        expiration_yr: card.expiration_yr,
      },
    });
  }

  async listCards(userId: string): Promise<any[]> {
    return await this.prisma.user_cards.findMany({
      where: { profile_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async deleteCard(userId: string, cardId: string): Promise<any> {
    return await this.prisma.user_cards.deleteMany({
      where: {
        id: cardId,
        profile_id: userId,
      },
    });
  }

  async findCardById(cardId: string): Promise<any> {
    return await this.prisma.user_cards.findFirst({
      where: { id: cardId },
    });
  }
}
