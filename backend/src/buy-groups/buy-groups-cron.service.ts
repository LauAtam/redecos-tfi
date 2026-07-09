import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from './infrastructure/mercado-pago.service';

@Injectable()
export class BuyGroupsCronService {
  private readonly logger = new Logger(BuyGroupsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
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

      // 2. Buscar todas las órdenes de esos grupos con status PAYMENT_HELD para liberar fondos
      const pendingOrders = await this.prisma.group_orders.findMany({
        where: {
          group_id: { in: expiredIds },
          status: 'PAYMENT_HELD',
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

      if (failedOrderIds.length > 0) {
        this.logger.error(
          `No se pudieron liberar fondos en Mercado Pago para ${failedOrderIds.length} órdenes. IDs: ${failedOrderIds.join(', ')}`,
        );
      }

      // 4. Transaccionalmente marcar grupos como CANCELLED y sólo las órdenes liberadas con éxito
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

      this.logger.log('Proceso de expiración y liberación de fondos completado.');
    } catch (error: any) {
      this.logger.error(`Error al expirar grupos de compra: ${error.message}`);
    }
  }
}
