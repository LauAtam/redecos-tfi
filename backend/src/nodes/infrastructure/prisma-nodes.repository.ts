import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { NodesRepository } from '../interfaces/nodes-repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNodeDto } from '../dto/create-node.dto';
import { UpdateNodeDto } from '../dto/update-node.dto';

@Injectable()
export class PrismaNodesRepository implements NodesRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<any[]> {
    const nodes = await this.prisma.nodos.findMany({
      include: {
        _count: {
          select: { profiles: true },
        },
      },
    });

    return nodes.map((node) => {
      const { _count, ...rest } = node;
      return {
        ...rest,
        participants_count: _count.profiles,
      };
    });
  }

  async findOne(id: string): Promise<any> {
    const node = await this.prisma.nodos.findUnique({
      where: { id },
    });
    if (!node) throw new NotFoundException(`Node with ID ${id} not found`);
    return node;
  }

  async create(createNodeDto: CreateNodeDto): Promise<any> {
    return await this.prisma.nodos.create({
      data: createNodeDto as any,
    });
  }

  async update(id: string, updateNodeDto: UpdateNodeDto): Promise<any> {
    try {
      return await this.prisma.nodos.update({
        where: { id },
        data: updateNodeDto as any,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Node with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    try {
      await this.prisma.nodos.delete({
        where: { id },
      });
      return { deleted: true };
    } catch (error: any) {
      if (error.code === 'P2025') {
        return { deleted: true };
      }
      throw error;
    }
  }

  async getDashboardStats(id: string): Promise<any> {
    const node = await this.findOne(id);

    const [
      processingOrderCount,
      shippedCount,
      readyForPickupCount,
      completedCount,
      finalizedCount
    ] = await Promise.all([
      this.prisma.buy_groups.count({ where: { node_id: id, status: 'PROCESSING_ORDER' } }),
      this.prisma.buy_groups.count({ where: { node_id: id, status: 'SHIPPED' } }),
      this.prisma.buy_groups.count({ where: { node_id: id, status: 'READY_FOR_PICKUP' } }),
      this.prisma.buy_groups.count({ where: { node_id: id, status: 'COMPLETED' } }),
      this.prisma.buy_groups.count({ where: { node_id: id, status: 'FINALIZED' } }),
    ]);

    return {
      node: {
        id: node.id,
        name: node.name,
        address: node.address,
        manager_name: node.manager_name,
      },
      stats: {
        processingOrderCount,
        shippedCount,
        readyForPickupCount,
        completedCount,
        finalizedCount,
      },
    };
  }

  async generateWithdrawalOtp(profileId: string): Promise<any> {
    const activeOrders = await this.prisma.group_orders.findMany({
      where: {
        profile_id: profileId,
        status: 'CONFIRMED',
        buy_groups: {
          status: 'READY_FOR_PICKUP',
        },
      },
      include: {
        buy_groups: {
          include: {
            productos: true,
            nodos: true,
          },
        },
      },
    });

    if (activeOrders.length === 0) {
      throw new BadRequestException('No tenés pedidos listos para retirar.');
    }

    // Generar un PIN aleatorio de 4 dígitos (p. ej. "1854")
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos de validez

    console.log('[DEBUG generateWithdrawalOtp] Generating OTP for profileId:', profileId);
    console.log('[DEBUG generateWithdrawalOtp] Generated OTP:', otp);
    console.log('[DEBUG generateWithdrawalOtp] Generated Exp:', expiresAt);

    await this.prisma.profiles.update({
      where: { id: profileId },
      data: {
        withdrawal_otp: otp,
        withdrawal_otp_exp: expiresAt,
      },
    });

    return {
      otp,
      expiresAt: expiresAt.toISOString(),
      orders: activeOrders.map((o) => ({
        id: o.id,
        productName: o.buy_groups.productos.name,
        quantity: o.quantity,
        nodeName: o.buy_groups.nodos.name,
        nodeId: o.buy_groups.node_id,
      })),
    };
  }

  async getClientPendingOrders(profileId: string, nodeId: string): Promise<any[]> {
    const orders = await this.prisma.group_orders.findMany({
      where: {
        profile_id: profileId,
        status: 'CONFIRMED',
        buy_groups: {
          node_id: nodeId,
          status: 'READY_FOR_PICKUP',
        },
      },
      include: {
        buy_groups: {
          include: {
            productos: true,
          },
        },
      },
    });

    return orders.map((o) => ({
      id: o.id,
      productName: o.buy_groups.productos.name,
      quantity: o.quantity,
      unitPrice: Number(o.unit_price),
      status: o.status,
    }));
  }

  async confirmDelivery(
    profileId: string,
    otp: string,
    orderIds: string[],
    nodeManagerProfileId: string,
  ): Promise<any> {
    const client = await this.prisma.profiles.findUnique({
      where: { id: profileId },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    console.log('[DEBUG confirmDelivery] Input ProfileId:', profileId);
    console.log('[DEBUG confirmDelivery] Input OTP:', otp);
    console.log('[DEBUG confirmDelivery] DB ProfileId:', client?.id);
    console.log('[DEBUG confirmDelivery] DB OTP:', client?.withdrawal_otp);
    console.log('[DEBUG confirmDelivery] DB OTP Exp:', client?.withdrawal_otp_exp);

    if (!client.withdrawal_otp || client.withdrawal_otp !== otp) {
      throw new UnauthorizedException('Código PIN inválido.');
    }

    if (client.withdrawal_otp_exp && new Date() > new Date(client.withdrawal_otp_exp)) {
      throw new UnauthorizedException('Código PIN expirado.');
    }

    // Buscar las órdenes afectadas para conocer a qué bultos pertenecen
    const affectedOrders = await this.prisma.group_orders.findMany({
      where: { id: { in: orderIds } },
      select: { group_id: true },
    });

    const uniqueGroupIds = [...new Set(affectedOrders.map((o) => o.group_id))];

    // Ejecutar transacción ACID de base de datos
    return await this.prisma.$transaction(async (tx) => {
      // 1. Marcar órdenes individuales como FINALIZED
      await tx.group_orders.updateMany({
        where: { id: { in: orderIds } },
        data: { status: 'FINALIZED' },
      });

      // 2. Limpiar el OTP del cliente
      await tx.profiles.update({
        where: { id: profileId },
        data: {
          withdrawal_otp: null,
          withdrawal_otp_exp: null,
        },
      });

      // 3. Verificar si el bulto padre de cada orden debe transicionar a FINALIZED
      for (const groupId of uniqueGroupIds) {
        const activeOrders = await tx.group_orders.findMany({
          where: {
            group_id: groupId,
            status: { not: 'CANCELLED' },
          },
        });

        const allFinalized = activeOrders.every((o) => o.status === 'FINALIZED');

        if (allFinalized && activeOrders.length > 0) {
          await tx.buy_groups.update({
            where: { id: groupId },
            data: {
              status: 'FINALIZED',
              closed_at: new Date(),
            },
          });
        }
      }

      return { success: true, message: 'Entrega confirmada exitosamente.' };
    });
  }
}

