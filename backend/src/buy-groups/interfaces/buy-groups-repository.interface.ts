import { JoinGroupDto } from '../dto/join-group.dto';

export abstract class BuyGroupsRepository {
  abstract getActiveGroups(nodeId: string): Promise<any>;
  abstract joinOrCreateGroup(userId: string, dto: JoinGroupDto): Promise<any>;
  abstract getMyOrders(userId: string): Promise<any>;
}
