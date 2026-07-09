import { Module } from '@nestjs/common';
import { BuyGroupsController } from './buy-groups.controller';
import { BuyGroupsService } from './buy-groups.service';
import { BuyGroupsRepository } from './interfaces/buy-groups-repository.interface';
import { PrismaBuyGroupsRepository } from './infrastructure/prisma-buy-groups.repository';
import { BuyGroupsCronService } from './buy-groups-cron.service';
import { MercadoPagoService } from './infrastructure/mercado-pago.service';

@Module({
  controllers: [BuyGroupsController],
  providers: [
    BuyGroupsService,
    BuyGroupsCronService,
    MercadoPagoService,
    {
      provide: BuyGroupsRepository,
      useClass: PrismaBuyGroupsRepository,
    },
  ],
})
export class BuyGroupsModule {}
