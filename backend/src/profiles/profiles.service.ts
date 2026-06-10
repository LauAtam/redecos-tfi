import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const client = this.supabaseService.getAdminClient();

    // 1. Si se proporciona default_node_id, verificar que exista en public.nodos
    if (dto.default_node_id) {
      const { data: node, error: nodeError } = await client
        .from('nodos')
        .select('id')
        .eq('id', dto.default_node_id)
        .single();

      if (nodeError || !node) {
        throw new BadRequestException('El nodo de retiro no existe.');
      }
    }

    // 2. Realizar actualización parcial en public.profiles
    const { data: updatedProfile, error: updateError } = await client
      .from('profiles')
      .update(dto)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw new BadRequestException(updateError.message);
    }

    return updatedProfile;
  }
}
