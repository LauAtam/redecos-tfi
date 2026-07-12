import { Injectable } from '@nestjs/common';
import { BuyGroupsRepository } from './interfaces/buy-groups-repository.interface';
import { JoinGroupDto } from './dto/join-group.dto';
import { ConsolidateGroupsDto } from './dto/consolidate-groups.dto';

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

  async findFiltered(filters: { status?: string; nodeId?: string; productId?: string }) {
    return await this.buyGroupsRepository.findFiltered(filters);
  }

  async updateStatus(id: string, status: string) {
    return await this.buyGroupsRepository.updateStatus(id, status);
  }

  async consolidateGroups(userId: string, userRole: string, dto: ConsolidateGroupsDto) {
    return await this.buyGroupsRepository.consolidateGroups(userId, userRole, dto);
  }
}

