import { UpdateProfileDto } from '../dto/update-profile.dto';

export abstract class ProfilesRepository {
  abstract updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<any>;

  abstract findProfileById(userId: string): Promise<any>;

  abstract addCard(
    userId: string,
    card: { card_id: string; last_four: string; brand: string; expiration_mo: number; expiration_yr: number },
  ): Promise<any>;

  abstract listCards(userId: string): Promise<any[]>;

  abstract deleteCard(userId: string, cardId: string): Promise<any>;

  abstract findCardById(cardId: string): Promise<any>;

  abstract getSavingsStats(userId: string): Promise<any>;

  abstract requestAccountDeletion(userId: string, reason: string | null): Promise<any>;
}
