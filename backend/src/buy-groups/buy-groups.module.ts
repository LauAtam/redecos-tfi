import { Module } from '@nestjs/common';
import { BuyGroupsController } from './buy-groups.controller';
import { BuyGroupsService } from './buy-groups.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [BuyGroupsController],
  providers: [BuyGroupsService],
  exports: [BuyGroupsService],
})
export class BuyGroupsModule {}
