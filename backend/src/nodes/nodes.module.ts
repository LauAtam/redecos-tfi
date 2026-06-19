import { Module } from '@nestjs/common';
import { NodesController } from './nodes.controller';
import { NodesService } from './nodes.service';
import { NodesRepository } from './interfaces/nodes-repository.interface';
import { PrismaNodesRepository } from './infrastructure/prisma-nodes.repository';

@Module({
  controllers: [NodesController],
  providers: [
    NodesService,
    {
      provide: NodesRepository,
      useClass: PrismaNodesRepository,
    },
  ],
})
export class NodesModule { }
