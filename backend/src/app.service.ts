import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getAdminDashboardStats() {
    const [totalProductos, totalNodos] = await Promise.all([
      this.prisma.productos.count(),
      this.prisma.nodos.count(),
    ]);

    const orders = await this.prisma.group_orders.findMany({
      where: {
        status: { not: 'CANCELLED' },
      },
      include: {
        buy_groups: {
          include: {
            productos: true,
          },
        },
      },
    });

    let totalSales = 0;
    let totalSavings = 0;

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const last6Months: { name: string; year: number; month: number; sales: number; savings: number }[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last6Months.push({
        name: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        sales: 0,
        savings: 0,
      });
    }

    for (const order of orders) {
      const salesAmount = Number(order.quantity) * Number(order.unit_price);
      totalSales += salesAmount;

      const retailPrice = Number(order.buy_groups.productos.retail_price || 0);
      const bulkPrice = Number(order.unit_price);
      const savingPerUnit = retailPrice > bulkPrice ? (retailPrice - bulkPrice) : (bulkPrice * 0.25);
      const savingsAmount = Number(order.quantity) * savingPerUnit;
      totalSavings += savingsAmount;

      const orderDate = new Date(order.created_at);
      const bucket = last6Months.find(b => b.year === orderDate.getFullYear() && b.month === orderDate.getMonth());
      if (bucket) {
        bucket.sales += salesAmount;
        bucket.savings += savingsAmount;
      }
    }

    const groups = await this.prisma.buy_groups.findMany();
    const statusCounts = {
      OPEN: 0,
      COMPLETED: 0,
      PROCESSING_ORDER: 0,
      SHIPPED: 0,
      READY_FOR_PICKUP: 0,
      FINALIZED: 0,
      CANCELLED: 0,
    };

    for (const g of groups) {
      if (statusCounts[g.status] !== undefined) {
        statusCounts[g.status]++;
      }
    }

    return {
      totalProductos,
      totalNodos,
      comisionesAcumuladas: totalSales * 0.10,
      totalSales,
      totalSavings,
      charts: {
        earnings: {
          labels: last6Months.map(b => b.name),
          data: last6Months.map(b => b.sales),
        },
        savings: {
          labels: last6Months.map(b => b.name),
          data: last6Months.map(b => b.savings),
        },
        pickups: {
          labels: ["Abiertos", "Completados", "En Mayorista", "Enviados", "En Nodo", "Finalizados", "Cancelados"],
          data: [
            statusCounts.OPEN,
            statusCounts.COMPLETED,
            statusCounts.PROCESSING_ORDER,
            statusCounts.SHIPPED,
            statusCounts.READY_FOR_PICKUP,
            statusCounts.FINALIZED,
            statusCounts.CANCELLED,
          ],
        },
      },
    };
  }
}
