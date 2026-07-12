import { Injectable, NotFoundException } from '@nestjs/common';
import { NodesRepository } from '../interfaces/nodes-repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNodeDto } from '../dto/create-node.dto';
import { UpdateNodeDto } from '../dto/update-node.dto';

@Injectable()
export class PrismaNodesRepository implements NodesRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
