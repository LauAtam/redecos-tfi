import { UpdateProfileDto } from '../dto/update-profile.dto';

export abstract class ProfilesRepository {
  abstract updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<any>;
}
