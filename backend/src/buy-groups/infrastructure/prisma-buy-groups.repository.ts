import { Injectable, BadRequestException } from '@nestjs/common';
import { BuyGroupsRepository } from '../interfaces/buy-groups-repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { JoinGroupDto } from '../dto/join-group.dto';

@Injectable()
export class PrismaBuyGroupsRepository implements BuyGroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveGroups(nodeId: string): Promise<any> {
    const groups = await this.prisma.buy_groups.findMany({
      where: {
        node_id: nodeId,
        status: 'OPEN',
      },
      include: {
        productos: true,
        group_orders: {
          select: {
            quantity: true,
            status: true,
          },
        },
      },
    });

    return groups.map((group) => {
      const activeOrders = group.group_orders.filter(
        (o) => o.status !== 'CANCELLED',
      );
      const gathered = activeOrders.reduce(
        (sum, order) => sum + (order.quantity || 0),
        0,
      );
      const unitsLeft = Math.max(0, group.target_size - gathered);

      return {
        id: group.id,
        productId: group.product_id,
        nodeId: group.node_id,
        status: group.status,
        targetSize: group.target_size,
        createdAt: group.created_at,
        closedAt: group.closed_at,
        product: {
          id: group.productos.id,
          name: group.productos.name,
          description: group.productos.description,
          price: group.productos.price,
          bulk_size: group.productos.bulk_size,
          image_url: group.productos.image_url,
          retail_price: group.productos.retail_price,
        },
        unitsBought: gathered,
        unitsLeft: unitsLeft,
        progress:
          group.target_size > 0 ? (gathered / group.target_size) * 100 : 0,
      };
    });
  }

  async joinOrCreateGroup(userId: string, dto: JoinGroupDto): Promise<any> {
    // 1. Fetch product, node, and active group in parallel
    const [product, node, activeGroup] = await Promise.all([
      this.prisma.productos.findUnique({
        where: { id: dto.productId },
        select: { price: true, bulk_size: true },
      }),
      this.prisma.nodos.findUnique({
        where: { id: dto.nodeId },
        select: { id: true },
      }),
      this.prisma.buy_groups.findFirst({
        where: {
          product_id: dto.productId,
          node_id: dto.nodeId,
          status: 'OPEN',
        },
        select: { id: true },
      }),
    ]);

    if (!product) {
      throw new BadRequestException('El producto no existe.');
    }

    if (!node) {
      throw new BadRequestException('El punto de retiro no existe.');
    }

    let groupId = activeGroup?.id;

    // 4. If no group exists, try to create one using an upsert-like logic to handle concurrency
    if (!groupId) {
      try {
        const newGroup = await this.prisma.buy_groups.create({
          data: {
            product_id: dto.productId,
            node_id: dto.nodeId,
            target_size: product.bulk_size,
            status: 'OPEN',
          },
          select: { id: true },
        });
        groupId = newGroup.id;
      } catch (error: any) {
        // Prisma P2002 is Unique constraint failed on the fields: (`product_id`,`node_id`) where status='OPEN' (if we had such index)
        // Let's retry fetching the group
        if (error.code === 'P2002') {
          const retryGroup = await this.prisma.buy_groups.findFirst({
            where: {
              product_id: dto.productId,
              node_id: dto.nodeId,
              status: 'OPEN',
            },
            select: { id: true },
          });

          if (!retryGroup) {
            throw new BadRequestException('Error al unirse al grupo de compra.');
          }
          groupId = retryGroup.id;
        } else {
          throw new BadRequestException(`No se pudo crear el grupo de compra: ${error.message}`);
        }
      }
    }

    if (!groupId) {
      throw new BadRequestException('No se pudo establecer el grupo de compra.');
    }

    // 5. Create the order
    let newOrder;
    try {
      newOrder = await this.prisma.group_orders.create({
        data: {
          group_id: groupId,
          profile_id: userId,
          quantity: dto.quantity,
          unit_price: product.price,
          status: 'CONFIRMED',
        },
      });
    } catch (error: any) {
      throw new BadRequestException(`No se pudo registrar tu compra: ${error.message}`);
    }

    // 6. Check if the group is now completed
    const activeOrders = await this.prisma.group_orders.findMany({
      where: {
        group_id: groupId,
        status: { not: 'CANCELLED' },
      },
      select: { quantity: true },
    });

    const totalQuantity = activeOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    
    if (totalQuantity >= product.bulk_size) {
      try {
        await this.prisma.buy_groups.update({
          where: { id: groupId },
          data: {
            status: 'CLOSED',
            closed_at: new Date(),
          },
        });
      } catch (updateError: any) {
        throw new BadRequestException(`No se pudo actualizar el estado del grupo: ${updateError.message}`);
      }
    }

    return newOrder;
  }

  async getMyOrders(userId: string): Promise<any> {
    const orders = await this.prisma.group_orders.findMany({
      where: { profile_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        buy_groups: {
          include: {
            productos: {
              select: {
                id: true,
                name: true,
                price: true,
                image_url: true,
              },
            },
            nodos: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      group_id: order.group_id,
      profile_id: order.profile_id,
      quantity: order.quantity,
      unit_price: order.unit_price,
      status: order.status,
      created_at: order.created_at,
      group: {
        id: order.buy_groups.id,
        status: order.buy_groups.status,
        target_size: order.buy_groups.target_size,
        product: order.buy_groups.productos,
        node: order.buy_groups.nodos,
      },
    }));
  }
}
