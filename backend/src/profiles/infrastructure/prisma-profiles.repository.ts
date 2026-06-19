import { Injectable, BadRequestException } from '@nestjs/common';
import { ProfilesRepository } from '../interfaces/profiles-repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class PrismaProfilesRepository implements ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
