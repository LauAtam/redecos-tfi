import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { JoinGroupDto } from './dto/join-group.dto';

@Injectable()
export class BuyGroupsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getActiveGroups(nodeId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('buy_groups')
      .select(`
        id,
        product_id,
        node_id,
        status,
        target_size,
        created_at,
        closed_at,
        product:productos (
          id,
          name,
          description,
          price,
          bulk_size,
          image_url,
          retail_price
        ),
        orders:group_orders (
          quantity,
          status
        )
      `)
      .eq('node_id', nodeId)
      .eq('status', 'OPEN');

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data || []).map((group: any) => {
      const activeOrders = (group.orders || []).filter((o: any) => o.status !== 'CANCELLED');
      const gathered = activeOrders.reduce((sum: number, order: any) => sum + (order.quantity || 0), 0);
      const unitsLeft = Math.max(0, group.target_size - gathered);

      return {
        id: group.id,
        productId: group.product_id,
        nodeId: group.node_id,
        status: group.status,
        targetSize: group.target_size,
        createdAt: group.created_at,
        closedAt: group.closed_at,
        product: group.product,
        unitsBought: gathered,
        unitsLeft: unitsLeft,
        progress: group.target_size > 0 ? (gathered / group.target_size) * 100 : 0
      };
    });
  }

  async joinOrCreateGroup(userId: string, dto: JoinGroupDto) {
    const client = this.supabaseService.getClient();

    // 1. Fetch product price and bulk size
    const { data: product, error: prodError } = await client
      .from('productos')
      .select('price, bulk_size')
      .eq('id', dto.productId)
      .single();

    if (prodError || !product) {
      throw new BadRequestException('El producto no existe.');
    }

    // 2. Fetch node to verify it exists
    const { data: node, error: nodeError } = await client
      .from('nodos')
      .select('id')
      .eq('id', dto.nodeId)
      .single();

    if (nodeError || !node) {
      throw new BadRequestException('El punto de retiro no existe.');
    }

    let groupId: string | undefined;

    // 3. Find if there is an active open group
    const { data: activeGroup, error: findError } = await client
      .from('buy_groups')
      .select('id')
      .eq('product_id', dto.productId)
      .eq('node_id', dto.nodeId)
      .eq('status', 'OPEN')
      .maybeSingle();

    if (!findError && activeGroup) {
      groupId = activeGroup.id;
    }

    // 4. If no group exists, try to create one
    if (!groupId) {
      const { data: newGroup, error: createError } = await client
        .from('buy_groups')
        .insert({
          product_id: dto.productId,
          node_id: dto.nodeId,
          target_size: product.bulk_size,
          status: 'OPEN'
        })
        .select('id')
        .single();

      if (createError) {
        // Concurrency check: check if someone else just created it (unique index constraint violation)
        if (createError.code === '23505') {
          const { data: retryGroup, error: retryError } = await client
            .from('buy_groups')
            .select('id')
            .eq('product_id', dto.productId)
            .eq('node_id', dto.nodeId)
            .eq('status', 'OPEN')
            .single();

          if (retryError || !retryGroup) {
            throw new BadRequestException('Error al unirse al grupo de compra.');
          }
          groupId = retryGroup.id;
        } else {
          throw new BadRequestException(`No se pudo crear el grupo de compra: ${createError.message}`);
        }
      } else if (newGroup) {
        groupId = newGroup.id;
      }
    }

    if (!groupId) {
      throw new BadRequestException('No se pudo establecer el grupo de compra.');
    }

    // 5. Create the order
    const { data: newOrder, error: orderError } = await client
      .from('group_orders')
      .insert({
        group_id: groupId,
        profile_id: userId,
        quantity: dto.quantity,
        unit_price: product.price,
        status: 'CONFIRMED'
      })
      .select()
      .single();

    if (orderError) {
      throw new BadRequestException(`No se pudo registrar tu compra: ${orderError.message}`);
    }

    return newOrder;
  }

  async getMyOrders(userId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('group_orders')
      .select(`
        id,
        group_id,
        profile_id,
        quantity,
        unit_price,
        status,
        created_at,
        group:buy_groups (
          id,
          status,
          target_size,
          product:productos (
            id,
            name,
            price,
            image_url
          ),
          node:nodos (
            id,
            name,
            address
          )
        )
      `)
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data || [];
  }
}
