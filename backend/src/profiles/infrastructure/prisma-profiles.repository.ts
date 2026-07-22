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

  async getSavingsStats(userId: string): Promise<any> {
    const orders = await this.prisma.group_orders.findMany({
      where: {
        profile_id: userId,
      },
      include: {
        buy_groups: {
          include: {
            productos: {
              include: {
                categories: true,
              },
            },
          },
        },
      },
    });

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const last6Months: { name: string; year: number; month: number; savings: number }[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last6Months.push({
        name: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        savings: 0,
      });
    }

    let totalSavings = 0;
    const categoryExpenses: { [key: string]: number } = {};
    const statusCounts: { [key: string]: number } = {
      PENDING: 0,
      CONFIRMED: 0,
      FINALIZED: 0,
      CANCELLED: 0,
    };

    for (const order of orders) {
      // Incrementar el estado de la orden
      const statusKey = order.status;
      if (statusCounts[statusKey] !== undefined) {
        statusCounts[statusKey]++;
      } else if (statusKey === 'PAYMENT_HELD') {
        // Mapear PAYMENT_HELD a PENDING para simplificar la vista del usuario
        statusCounts['PENDING']++;
      }

      // Solo calcular ahorro y consumos para órdenes pagadas/confirmadas o finalizadas
      if (order.status !== 'CONFIRMED' && order.status !== 'FINALIZED') {
        continue;
      }

      if (!order.buy_groups || !order.buy_groups.productos) continue;
      
      const retailPrice = Number(order.buy_groups.productos.retail_price || 0);
      const bulkPrice = Number(order.unit_price);
      const savingPerUnit = retailPrice > bulkPrice ? (retailPrice - bulkPrice) : (bulkPrice * 0.25);
      const savingsAmount = Number(order.quantity) * savingPerUnit;
      totalSavings += savingsAmount;

      const orderDate = new Date(order.created_at);
      const bucket = last6Months.find(b => b.year === orderDate.getFullYear() && b.month === orderDate.getMonth());
      if (bucket) {
        bucket.savings += savingsAmount;
      }

      // Acumular gasto por categoría
      const category = order.buy_groups.productos.categories?.name || 'Otros';
      const orderCost = Number(order.quantity) * Number(order.unit_price);
      categoryExpenses[category] = (categoryExpenses[category] || 0) + orderCost;
    }

    return {
      totalSavings,
      charts: {
        savings: {
          labels: last6Months.map(b => b.name),
          data: last6Months.map(b => b.savings),
        },
        categories: {
          labels: Object.keys(categoryExpenses),
          data: Object.values(categoryExpenses),
        },
        ordersStatus: {
          labels: ["Pendientes", "Confirmadas", "Entregadas", "Canceladas"],
          data: [
            statusCounts.PENDING,
            statusCounts.CONFIRMED,
            statusCounts.FINALIZED,
            statusCounts.CANCELLED,
          ],
        },
      },
    };
  }
}
