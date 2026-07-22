import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from './infrastructure/mercado-pago.service';

@Injectable()
export class BuyGroupsCronService {
  private readonly logger = new Logger(BuyGroupsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiration() {
    this.logger.log('Iniciando proceso diario de expiración de grupos de compra...');
    const now = new Date();

    try {
      // 1. Buscar grupos abiertos que ya hayan vencido
      const expiredGroups = await this.prisma.buy_groups.findMany({
        where: {
          status: 'OPEN',
          expires_at: { lte: now },
        },
        select: { id: true },
      });

      if (expiredGroups.length === 0) {
        this.logger.log('No se encontraron grupos vencidos para cancelar.');
        return;
      }

      const expiredIds = expiredGroups.map((g) => g.id);
      this.logger.log(`Encontrados ${expiredIds.length} grupos vencidos. Cancelando...`);

      // Obtener detalles de los grupos expirados para notificar a los clientes
      const groupsToNotify = await this.prisma.buy_groups.findMany({
        where: {
          id: { in: expiredIds },
        },
        include: {
          productos: true,
          group_orders: {
            where: {
              status: { in: ['PAYMENT_HELD', 'CONFIRMED'] },
            },
            include: {
              profiles: true,
            },
          },
        },
      });

      // 2. Buscar todas las órdenes de esos grupos con status PAYMENT_HELD para liberar fondos
      const pendingOrders = await this.prisma.group_orders.findMany({
        where: {
          group_id: { in: expiredIds },
          status: 'PAYMENT_HELD',
        },
        select: { id: true, payment_intent_id: true },
      });

      // 2b. Buscar órdenes cobradas (CONFIRMED) de esos grupos para reembolsar fondos
      const confirmedOrders = await this.prisma.group_orders.findMany({
        where: {
          group_id: { in: expiredIds },
          status: 'CONFIRMED',
        },
        select: { id: true, payment_intent_id: true },
      });

      // 3. Liberar dinero de las pre-autorizaciones en Mercado Pago de forma controlada
      const cancelResults = await Promise.allSettled(
        pendingOrders
          .filter((o) => o.payment_intent_id)
          .map(async (o) => {
            const success = await this.mercadoPago.cancelPayment(o.payment_intent_id!);
            return { orderId: o.id, success };
          }),
      );

      // 3b. Reembolsar dinero de las capturas cobradas (CONFIRMED) en Mercado Pago de forma controlada
      const refundResults = await Promise.allSettled(
        confirmedOrders
          .filter((o) => o.payment_intent_id)
          .map(async (o) => {
            const success = await this.mercadoPago.refundPayment(o.payment_intent_id!);
            return { orderId: o.id, success };
          }),
      );

      const successfulOrderIds: string[] = [];
      const failedOrderIds: string[] = [];

      cancelResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successfulOrderIds.push(result.value.orderId);
          } else {
            failedOrderIds.push(result.value.orderId);
          }
        }
      });

      refundResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successfulOrderIds.push(result.value.orderId);
          } else {
            failedOrderIds.push(result.value.orderId);
          }
        }
      });

      if (failedOrderIds.length > 0) {
        this.logger.error(
          `No se pudieron liberar/reembolsar fondos en Mercado Pago para ${failedOrderIds.length} órdenes. IDs: ${failedOrderIds.join(', ')}`,
        );
      }

      // 4. Transaccionalmente marcar grupos como CANCELLED y sólo las órdenes liberadas/reembolsadas con éxito
      await this.prisma.$transaction(async (tx) => {
        await tx.buy_groups.updateMany({
          where: {
            id: { in: expiredIds },
          },
          data: {
            status: 'CANCELLED',
          },
        });

        if (successfulOrderIds.length > 0) {
          await tx.group_orders.updateMany({
            where: {
              id: { in: successfulOrderIds },
            },
            data: {
              status: 'CANCELLED',
            },
          });
        }
      });

      // Emitir eventos de cancelación para cada grupo expirado con compradores
      for (const group of groupsToNotify) {
        const emails = group.group_orders
          .map((o) => o.profiles?.email)
          .filter((e): e is string => !!e);
        if (emails.length > 0) {
          this.eventEmitter.emit('buyGroup.cancelled', {
            emails,
            groupName: group.productos.name,
          });
        }
      }

      this.logger.log('Proceso de expiración, liberación y reembolso de fondos completado.');
    } catch (error: any) {
      this.logger.error(`Error al expirar grupos de compra: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCleanupPendingOrders() {
    this.logger.log('Iniciando limpieza de órdenes en estado PENDING colgadas...');
    const threshold = new Date(Date.now() - 1 * 60 * 1000); // 1 minuto atrás

    try {
      const deleted = await this.prisma.group_orders.deleteMany({
        where: {
          status: 'PENDING',
          created_at: { lte: threshold },
        },
      });

      if (deleted.count > 0) {
        this.logger.log(`🧹 Limpieza completada: se eliminaron ${deleted.count} órdenes huérfanas en PENDING.`);
      } else {
        this.logger.log('No se encontraron órdenes PENDING colgadas para limpiar.');
      }
    } catch (error: any) {
      this.logger.error(`Error al limpiar órdenes PENDING colgadas: ${error.message}`);
    }
  }
}
