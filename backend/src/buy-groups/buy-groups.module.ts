import { Module } from '@nestjs/common';
import { BuyGroupsController } from './buy-groups.controller';
import { BuyGroupsService } from './buy-groups.service';
import { BuyGroupsRepository } from './interfaces/buy-groups-repository.interface';
import { PrismaBuyGroupsRepository } from './infrastructure/prisma-buy-groups.repository';

@Module({
  controllers: [BuyGroupsController],
  providers: [
    BuyGroupsService,
    {
      provide: BuyGroupsRepository,
      useClass: PrismaBuyGroupsRepository,
    },
  ],
})
export class BuyGroupsModule {}
