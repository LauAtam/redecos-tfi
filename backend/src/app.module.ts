import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ProfilesModule } from './profiles/profiles.module';
import { BuyGroupsModule } from './buy-groups/buy-groups.module';
import { NodesModule } from './nodes/nodes.module';
import { PrismaModule } from './prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    NodesModule,
    ProductsModule,
    ProfilesModule,
    BuyGroupsModule,
    EventEmitterModule.forRoot(),
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
