import { Injectable } from '@nestjs/common';
import { ProfilesRepository } from './interfaces/profiles-repository.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly profilesRepository: ProfilesRepository) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return await this.profilesRepository.updateProfile(userId, dto);
  }
}
