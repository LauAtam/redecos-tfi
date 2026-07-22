import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { BuyGroupsRepository } from '../interfaces/buy-groups-repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { JoinGroupDto } from '../dto/join-group.dto';
import { ConsolidateGroupsDto } from '../dto/consolidate-groups.dto';
import { MercadoPagoService } from './mercado-pago.service';
import { MercadoPagoErrorMapper } from './mercado-pago-error.mapper';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Injectable()
export class PrismaBuyGroupsRepository implements BuyGroupsRepository {
  private readonly logger = new Logger(PrismaBuyGroupsRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async getActiveGroups(nodeId: string): Promise<any> {
    const groups = await this.prisma.buy_groups.findMany({
      where: {
        node_id: nodeId,
        status: 'OPEN',
        expires_at: { gt: new Date() },
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
    // 1. Fetch product, node, and user profile in parallel (read-only queries, no lock needed yet)
    const [product, node, profile] = await Promise.all([
      this.prisma.productos.findUnique({
        where: { id: dto.productId },
        select: { price: true, bulk_size: true },
      }),
      this.prisma.nodos.findUnique({
        where: { id: dto.nodeId },
        select: { id: true },
      }),
      this.prisma.profiles.findUnique({
        where: { id: userId },
        select: { customer_id: true, email: true },
      }),
    ]);

    if (!product) {
      throw new BadRequestException('El producto no existe.');
    }

    if (!node) {
      throw new BadRequestException('El punto de retiro no existe.');
    }

    const unitPrice = Number(product.price);
    if (dto.quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero.');
    }

    // --- FASE 1: RESERVA transaccional rápida con bloqueo consultivo ---
    let groupId = '';
    let tempOrderId = '';

    await this.prisma.$transaction(
      async (tx) => {
        // 1. Bloquear la fila del producto para serializar cualquier compra de este producto y evitar condiciones de carrera (compatible con poolers en modo transacción)
        await tx.$queryRaw`SELECT id FROM productos WHERE id = ${dto.productId}::uuid FOR UPDATE`;

        // 2. Buscar si hay un grupo OPEN activo
        let activeGroup = await tx.buy_groups.findFirst({
          where: {
            product_id: dto.productId,
            node_id: dto.nodeId,
            status: 'OPEN',
            expires_at: { gt: new Date() },
          },
          select: { id: true },
        });

        // 3. Si no existe, crear el grupo
        if (!activeGroup) {
          // Robustez: Si hay grupos OPEN pero expirados, cambiarlos a CANCELLED transaccionalmente
          // para evitar violar el índice único condicional 'idx_unique_open_group'
          await tx.buy_groups.updateMany({
            where: {
              product_id: dto.productId,
              node_id: dto.nodeId,
              status: 'OPEN',
              expires_at: { lte: new Date() },
            },
            data: {
              status: 'CANCELLED',
              closed_at: new Date(),
            },
          });

          const nowBaires = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
          const expiresAtBaires = new Date(nowBaires);
          expiresAtBaires.setHours(23, 59, 59, 999);
          const diffMs = expiresAtBaires.getTime() - nowBaires.getTime();
          const expiresAt = new Date(Date.now() + diffMs);

          activeGroup = await tx.buy_groups.create({
            data: {
              product_id: dto.productId,
              node_id: dto.nodeId,
              target_size: product.bulk_size,
              status: 'OPEN',
              expires_at: expiresAt,
            },
            select: { id: true },
          });
        }

        groupId = activeGroup.id;

        // Autolimpieza preventiva: Eliminar reservas PENDING huérfanas de más de 5 minutos en este grupo
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        await tx.group_orders.deleteMany({
          where: {
            group_id: groupId,
            status: 'PENDING',
            created_at: { lte: fiveMinutesAgo },
          },
        });

        // 4. Calcular el espacio ocupado por órdenes confirmadas, pre-autorizadas o reservas activas (PENDING)
        const existingOrders = await tx.group_orders.findMany({
          where: {
            group_id: groupId,
            status: { in: ['PAYMENT_HELD', 'CONFIRMED', 'PENDING'] },
          },
          select: { quantity: true },
        });

        const gathered = existingOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
        const unitsLeft = product.bulk_size - gathered;

        if (dto.quantity > unitsLeft) {
          throw new BadRequestException(
            `La cantidad solicitada (${dto.quantity}) supera las unidades disponibles para completar el grupo (${unitsLeft}).`,
          );
        }

        // 5. Crear la orden de reserva temporal en estado PENDING
        const tempOrder = await tx.group_orders.create({
          data: {
            group_id: groupId,
            profile_id: userId,
            quantity: dto.quantity,
            unit_price: unitPrice,
            status: 'PENDING',
          },
          select: { id: true },
        });

        tempOrderId = tempOrder.id;
      }, { timeout: 20000, maxWait: 15000 });

    // --- FASE 2: Pre-autorización en Mercado Pago (Fuera de la transacción de DB) ---
    const cardToken = dto.paymentToken;
    const amount = Math.round(unitPrice * dto.quantity * 100) / 100;
    let paymentResult;

    try {
      paymentResult = await this.mercadoPago.createPreauthorizedPayment(
        amount,
        cardToken,
        dto.cardholderEmail || profile?.email || '',
        dto.paymentMethodId,
        profile?.customer_id || undefined,
      );
    } catch (paymentError: any) {
      // Liberar la reserva en DB eliminando la orden temporal si falla el pago
      await this.prisma.group_orders.delete({
        where: { id: tempOrderId },
      });
      // Limpiar el grupo si quedó vacío (por si fue el primer intento fallido de iniciar el grupo)
      await this.cleanupEmptyGroup(groupId);

      throw MercadoPagoErrorMapper.map(paymentError.raw || paymentError);
    }

    if (
      !paymentResult ||
      !paymentResult.id ||
      !['authorized', 'approved', 'pending', 'in_process'].includes(paymentResult.status)
    ) {
      await this.prisma.group_orders.delete({
        where: { id: tempOrderId },
      });
      // Limpiar el grupo si quedó vacío
      await this.cleanupEmptyGroup(groupId);

      throw new BadRequestException(
        `El pago fue rechazado o no pudo ser procesado por Mercado Pago. Estado: ${paymentResult?.status || 'desconocido'}.`,
      );
    }

    // --- FASE 3: Confirmación de orden y evaluación de completitud del grupo ---
    let newOrder;
    try {
      newOrder = await this.prisma.group_orders.update({
        where: { id: tempOrderId },
        data: {
          status: 'PAYMENT_HELD',
          payment_intent_id: paymentResult.id,
        },
      });
    } catch (error: any) {
      // Si falla la actualización en base de datos, cancelamos el cobro en MP para evitar cobros huérfanos
      try {
        await this.mercadoPago.cancelPayment(paymentResult.id);
      } catch (cancelErr) {
        console.error('Fallo al revertir cargo en MP tras error de base de datos:', cancelErr);
      }
      try {
        await this.prisma.group_orders.delete({ where: { id: tempOrderId } });
      } catch (e) { }
      throw new BadRequestException(`No se pudo confirmar tu reserva de compra: ${error.message}`);
    }

    // Comprobar si con esta orden el grupo ya alcanzó el target_size
    const activeOrders = await this.prisma.group_orders.findMany({
      where: {
        group_id: groupId,
        status: { in: ['PAYMENT_HELD', 'CONFIRMED'] },
      },
      select: { id: true, quantity: true, payment_intent_id: true, status: true },
    });

    const totalGathered = activeOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

    if (totalGathered >= product.bulk_size) {
      // El grupo alcanzó el tamaño objetivo. Capturar de forma diferida todos los fondos en paralelo
      // Filtrar únicamente los pagos que estén retenidos (PAYMENT_HELD) y evitar duplicar la captura de pagos ya confirmados (CONFIRMED)
      const captureResults = await Promise.allSettled(
        activeOrders
          .filter((o) => o.payment_intent_id && o.status === 'PAYMENT_HELD')
          .map(async (o) => {
            const success = await this.mercadoPago.capturePayment(o.payment_intent_id!);
            return { orderId: o.id, success };
          }),
      );

      const successfulOrderIds: string[] = [];
      const failedOrderIds: string[] = [];

      captureResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successfulOrderIds.push(result.value.orderId);
          } else {
            failedOrderIds.push(result.value.orderId);
          }
        }
      });

      // Transaccionalmente: cerrar grupo o reabrirlo, actualizar órdenes cobradas y descontar stock si corresponde
      try {
        const allCapturesSuccessful = failedOrderIds.length === 0;

        await this.prisma.$transaction(async (tx) => {
          if (allCapturesSuccessful) {
            // Caso feliz: cerrar grupo como COMPLETED
            await tx.buy_groups.update({
              where: { id: groupId },
              data: {
                status: 'COMPLETED',
                closed_at: new Date(),
              },
            });

            // Restar 1 unidad del stock
            await tx.productos.update({
              where: { id: dto.productId },
              data: { stock: { decrement: 1 } },
            });
          } else {
            this.logger.warn(
              `⚠️ Falla parcial de cobros en grupo ${groupId}. Exitosas: ${successfulOrderIds.length}, Fallidas: ${failedOrderIds.length}. El grupo permanece OPEN para buscar reemplazos.`,
            );
          }

          if (successfulOrderIds.length > 0) {
            await tx.group_orders.updateMany({
              where: { id: { in: successfulOrderIds } },
              data: { status: 'CONFIRMED' },
            });
          }

          if (failedOrderIds.length > 0) {
            await tx.group_orders.updateMany({
              where: { id: { in: failedOrderIds } },
              data: { status: 'CANCELLED' },
            });
          }
        });

        // Actualizar estado en el objeto de respuesta local para el usuario que cerró el grupo
        if (successfulOrderIds.includes(newOrder.id)) {
          newOrder.status = 'CONFIRMED';
        } else if (failedOrderIds.includes(newOrder.id)) {
          newOrder.status = 'CANCELLED';
        }

        if (allCapturesSuccessful) {
          this.emitGroupEvent(groupId, 'buyGroup.consolidated');
        }
      } catch (updateError: any) {
        throw new BadRequestException(`No se pudo consolidar el grupo y capturar los pagos: ${updateError.message}`);
      }
    }

    return newOrder;
  }

  private async emitGroupEvent(groupId: string, eventName: string) {
    try {
      const group = await this.prisma.buy_groups.findUnique({
        where: { id: groupId },
        include: {
          productos: true,
          group_orders: {
            where: { status: { not: 'CANCELLED' } },
            include: { profiles: true }
          }
        }
      });

      if (group) {
        const emails = group.group_orders.map(o => o.profiles?.email).filter(e => e);
        if (emails.length > 0) {
          this.eventEmitter.emit(eventName, { emails, groupName: group.productos.name });
        }
      }
    } catch (err) {
      this.logger.error(`Error emitting event ${eventName} for group ${groupId}`, err);
    }
  }

  private async cleanupEmptyGroup(groupId: string): Promise<void> {
    try {
      const activeOrdersCount = await this.prisma.group_orders.count({
        where: { group_id: groupId },
      });
      if (activeOrdersCount === 0) {
        await this.prisma.buy_groups.delete({
          where: { id: groupId },
        });
        this.logger.log(`🧹 Grupo de compra vacío ${groupId} eliminado correctamente.`);
      }
    } catch (cleanupError: any) {
      this.logger.error(`❌ Fallo al limpiar grupo de compra vacío ${groupId}: ${cleanupError.message}`);
    }
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

  async findFiltered(filters: { status?: string; nodeId?: string; productId?: string }): Promise<any[]> {
    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.nodeId) {
      where.node_id = filters.nodeId;
    }
    if (filters.productId) {
      where.product_id = filters.productId;
    }

    const groups = await this.prisma.buy_groups.findMany({
      where,
      include: {
        productos: true,
        nodos: true,
        group_orders: {
          select: {
            id: true,
            quantity: true,
            status: true,
            profiles: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
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
        expiresAt: group.expires_at,
        product: {
          id: group.productos.id,
          name: group.productos.name,
          description: group.productos.description,
          price: group.productos.price,
          bulk_size: group.productos.bulk_size,
          image_url: group.productos.image_url,
          retail_price: group.productos.retail_price,
        },
        node: {
          id: group.nodos.id,
          name: group.nodos.name,
          address: group.nodos.address,
        },
        unitsBought: gathered,
        unitsLeft: unitsLeft,
        progress:
          group.target_size > 0 ? (gathered / group.target_size) * 100 : 0,
        orders: activeOrders.map(o => ({
          id: o.id,
          quantity: o.quantity,
          status: o.status,
          buyerName: `${o.profiles?.first_name || ''} ${o.profiles?.last_name || ''}`.trim() || 'Vecino',
          buyerEmail: o.profiles?.email || '',
        })),
      };
    });
  }

  async updateStatus(id: string, status: string): Promise<any> {
    const group = await this.prisma.buy_groups.findUnique({
      where: { id },
      include: { group_orders: true },
    });

    if (!group) {
      throw new BadRequestException('El grupo de compra especificado no existe.');
    }

    if (status === 'COMPLETED' || status === 'PROCESSING_ORDER') {
      const activeOrders = await this.prisma.group_orders.findMany({
        where: {
          group_id: id,
          status: { in: ['CONFIRMED', 'PAYMENT_HELD'] },
        },
        select: { quantity: true },
      });
      const gathered = activeOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
      if (gathered < group.target_size) {
        throw new BadRequestException(
          `No se puede cambiar el estado a ${status} porque el grupo de compra no ha alcanzado las unidades del bulto (${gathered}/${group.target_size}).`,
        );
      }
    }

    const updateData: any = { status };
    if (status === 'COMPLETED' || status === 'FINALIZED' || status === 'CANCELLED') {
      updateData.closed_at = new Date();
    }

    const successfulOrderIds: string[] = [];
    if (status === 'CANCELLED') {
      const pendingOrders = await this.prisma.group_orders.findMany({
        where: {
          group_id: id,
          status: 'PAYMENT_HELD',
        },
        select: { id: true, payment_intent_id: true },
      });

      const confirmedOrders = await this.prisma.group_orders.findMany({
        where: {
          group_id: id,
          status: 'CONFIRMED',
        },
        select: { id: true, payment_intent_id: true },
      });

      if (pendingOrders.length > 0) {
        const cancelResults = await Promise.allSettled(
          pendingOrders
            .filter((o) => o.payment_intent_id)
            .map(async (o) => {
              const success = await this.mercadoPago.cancelPayment(o.payment_intent_id!);
              return { orderId: o.id, success };
            }),
        );

        cancelResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successfulOrderIds.push(result.value.orderId);
          }
        });
      }

      if (confirmedOrders.length > 0) {
        const refundResults = await Promise.allSettled(
          confirmedOrders
            .filter((o) => o.payment_intent_id)
            .map(async (o) => {
              const success = await this.mercadoPago.refundPayment(o.payment_intent_id!);
              return { orderId: o.id, success };
            }),
        );

        refundResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successfulOrderIds.push(result.value.orderId);
          }
        });
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedGroup = await tx.buy_groups.update({
        where: { id },
        data: updateData,
      });

      if (status === 'FINALIZED') {
        await tx.group_orders.updateMany({
          where: { group_id: id, status: 'CONFIRMED' },
          data: { status: 'FINALIZED' },
        });
      }

      if (status === 'CANCELLED') {
        if (successfulOrderIds.length > 0) {
          await tx.group_orders.updateMany({
            where: { id: { in: successfulOrderIds } },
            data: { status: 'CANCELLED' },
          });
          await tx.group_orders.updateMany({
            where: {
              group_id: id,
              status: { in: ['PENDING', 'PAYMENT_HELD', 'CONFIRMED'] },
              id: { notIn: successfulOrderIds },
            },
            data: { status: 'CANCELLED' },
          });
        } else {
          await tx.group_orders.updateMany({
            where: {
              group_id: id,
              status: { in: ['PENDING', 'PAYMENT_HELD', 'CONFIRMED'] },
            },
            data: { status: 'CANCELLED' },
          });
        }
      }

      return updatedGroup;
    }).then(result => {
      if (status === 'SHIPPED') this.emitGroupEvent(id, 'buyGroup.shipped');
      if (status === 'READY_FOR_PICKUP') this.emitGroupEvent(id, 'buyGroup.readyForPickup');
      if (status === 'FINALIZED') this.emitGroupEvent(id, 'buyGroup.retrieved');
      return result;
    });
  }

  async consolidateGroups(userId: string, userRole: string, dto: ConsolidateGroupsDto): Promise<any> {
    const { nodeId, groupIds } = dto;

    // 1. Validar que el nodo existe
    const node = await this.prisma.nodos.findUnique({
      where: { id: nodeId },
    });
    if (!node) {
      throw new BadRequestException('El nodo de retiro especificado no existe.');
    }

    // 2. Aislamiento de seguridad: si es rol NODO, validar correspondencia de nodo
    if (userRole === 'NODO') {
      const profile = await this.prisma.profiles.findUnique({
        where: { id: userId },
        select: { default_node_id: true },
      });
      if (!profile || profile.default_node_id !== nodeId) {
        throw new ForbiddenException('No tiene permisos para consolidar grupos de otros nodos.');
      }
    }

    // 3. Determinar los grupos a consolidar
    const whereClause: any = {
      node_id: nodeId,
      status: 'COMPLETED',
    };

    if (groupIds && groupIds.length > 0) {
      whereClause.id = { in: groupIds };
    }

    const groupsToConsolidate = await this.prisma.buy_groups.findMany({
      where: whereClause,
      include: {
        productos: true,
        group_orders: {
          where: { status: 'CONFIRMED' },
        },
      },
    });

    if (groupsToConsolidate.length === 0) {
      throw new BadRequestException('No se encontraron grupos en estado COMPLETED para consolidar.');
    }

    for (const group of groupsToConsolidate) {
      const totalQuantity = group.group_orders.reduce((sum, order) => sum + order.quantity, 0);
      if (totalQuantity < group.target_size) {
        throw new BadRequestException(
          `El grupo de compra para ${group.productos.name} (${group.id.substring(0, 8)}) no puede ser consolidado porque no ha alcanzado las unidades del bulto (${totalQuantity}/${group.target_size}).`,
        );
      }
    }

    const actualGroupIds = groupsToConsolidate.map((g) => g.id);

    // 4. Cambiar transaccionalmente el estado a 'PROCESSING_ORDER'
    await this.prisma.$transaction(async (tx) => {
      await tx.buy_groups.updateMany({
        where: { id: { in: actualGroupIds } },
        data: { status: 'PROCESSING_ORDER' },
      });
    });

    // 5. Calcular consolidado agrupando por producto
    const productSummaryMap = new Map<string, {
      productId: string;
      productName: string;
      totalQuantity: number;
      bulkSize: number;
      totalBulks: number;
      wholesaleUnitPrice: number;
      totalAmount: number;
    }>();

    for (const group of groupsToConsolidate) {
      const totalQuantity = group.group_orders.reduce((sum, order) => sum + order.quantity, 0);
      const wholesaleUnitPrice = Number(group.productos.price);
      const amount = totalQuantity * wholesaleUnitPrice;

      const existing = productSummaryMap.get(group.product_id);
      if (existing) {
        existing.totalQuantity += totalQuantity;
        existing.totalAmount += amount;
        existing.totalBulks = Math.ceil(existing.totalQuantity / existing.bulkSize);
      } else {
        productSummaryMap.set(group.product_id, {
          productId: group.product_id,
          productName: group.productos.name,
          totalQuantity,
          bulkSize: group.productos.bulk_size,
          totalBulks: Math.ceil(totalQuantity / group.productos.bulk_size),
          wholesaleUnitPrice,
          totalAmount: amount,
        });
      }
    }

    const items = Array.from(productSummaryMap.values());
    const totalPurchaseAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

    return {
      nodeId,
      consolidatedAt: new Date(),
      consolidatedGroupsCount: actualGroupIds.length,
      items,
      totalPurchaseAmount,
    };
  }
}
