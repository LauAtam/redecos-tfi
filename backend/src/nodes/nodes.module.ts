import { Module } from '@nestjs/common';
import { NodesController } from './nodes.controller';
import { NodesService } from './nodes.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { NodesRepository } from './interfaces/nodes-repository.interface';
import { SupabaseNodesRepository } from './infrastructure/supabase-nodes.repository';

@Module({
  imports: [SupabaseModule],
  controllers: [NodesController],
  providers: [
    NodesService,
    {
      provide: NodesRepository,
      useClass: SupabaseNodesRepository,
    },
  ],
})
export class NodesModule {}
