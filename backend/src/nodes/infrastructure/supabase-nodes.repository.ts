import { Injectable, NotFoundException } from '@nestjs/common';
import { NodesRepository } from '../interfaces/nodes-repository.interface';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateNodeDto } from '../dto/create-node.dto';
import { UpdateNodeDto } from '../dto/update-node.dto';

@Injectable()
export class SupabaseNodesRepository implements NodesRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<any[]> {
    const client = this.supabaseService.getAdminClient();
    const { data: nodes, error: nodesError } = await client.from('nodos').select('*');
    if (nodesError) throw nodesError;

    // Obtener los conteos de default_node_id desde profiles
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('default_node_id');
    
    // Si hay un error obteniendo perfiles, retornamos los nodos sin recuento (o lanzamos error)
    if (profilesError) {
      console.warn('Error fetching profiles default_node_id counts:', profilesError);
      return nodes.map(n => ({ ...n, participants_count: 0 }));
    }

    const counts = new Map<string, number>();
    profiles.forEach(p => {
      if (p.default_node_id) {
        counts.set(p.default_node_id, (counts.get(p.default_node_id) || 0) + 1);
      }
    });

    return nodes.map(node => ({
      ...node,
      participants_count: counts.get(node.id) || 0,
    }));
  }

  async findOne(id: string): Promise<any> {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('nodos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException(`Node with ID ${id} not found`);
    return data;
  }

  async create(createNodeDto: CreateNodeDto): Promise<any> {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('nodos')
      .insert(createNodeDto)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, updateNodeDto: UpdateNodeDto): Promise<any> {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('nodos')
      .update(updateNodeDto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client.from('nodos').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }
}
