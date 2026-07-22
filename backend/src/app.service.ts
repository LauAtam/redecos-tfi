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
            nodos: true,
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

    const nodeSales: { [key: string]: { name: string; sales: number } } = {};

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

      // Agrupar ventas por nodo
      const node = order.buy_groups?.nodos;
      if (node) {
        if (!nodeSales[node.id]) {
          nodeSales[node.id] = { name: node.name, sales: 0 };
        }
        nodeSales[node.id].sales += salesAmount;
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

    // Ordenar ranking de nodos
    const sortedNodeSales = Object.values(nodeSales)
      .sort((a, b) => b.sales - a.sales);

    return {
      totalProductos,
      totalNodos,
      comisionesAcumuladas: totalSales * 0.10,
      totalSales,
      totalSavings,
      charts: {
        earnings: {
          labels: last6Months.map(b => b.name),
          salesData: last6Months.map(b => b.sales),
          commissionData: last6Months.map(b => b.sales * 0.10),
        },
        nodeRanking: {
          labels: sortedNodeSales.map(n => n.name),
          data: sortedNodeSales.map(n => n.sales),
        },
        consolidationSuccess: {
          labels: ["Abiertos", "Consolidados", "Cancelados"],
          data: [
            statusCounts.OPEN,
            statusCounts.COMPLETED + statusCounts.PROCESSING_ORDER + statusCounts.SHIPPED + statusCounts.READY_FOR_PICKUP + statusCounts.FINALIZED,
            statusCounts.CANCELLED,
          ],
        },
      },
    };
  }
}
