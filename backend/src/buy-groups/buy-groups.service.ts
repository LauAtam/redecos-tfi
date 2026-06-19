import { Injectable } from '@nestjs/common';
import { BuyGroupsRepository } from './interfaces/buy-groups-repository.interface';
import { JoinGroupDto } from './dto/join-group.dto';

@Injectable()
export class BuyGroupsService {
  constructor(private readonly buyGroupsRepository: BuyGroupsRepository) {}

  async getActiveGroups(nodeId: string) {
    return await this.buyGroupsRepository.getActiveGroups(nodeId);
  }

  async joinOrCreateGroup(userId: string, dto: JoinGroupDto) {
    return await this.buyGroupsRepository.joinOrCreateGroup(userId, dto);
  }

  async getMyOrders(userId: string) {
    return await this.buyGroupsRepository.getMyOrders(userId);
  }
}
