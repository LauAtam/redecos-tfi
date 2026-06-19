import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { ProfilesRepository } from './interfaces/profiles-repository.interface';
import { PrismaProfilesRepository } from './infrastructure/prisma-profiles.repository';

@Module({
  controllers: [ProfilesController],
  providers: [
    ProfilesService,
    {
      provide: ProfilesRepository,
      useClass: PrismaProfilesRepository,
    },
  ],
  exports: [ProfilesService],
})
export class ProfilesModule {}
