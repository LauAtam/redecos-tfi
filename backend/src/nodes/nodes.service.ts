import { Injectable } from '@nestjs/common';
import { NodesRepository } from './interfaces/nodes-repository.interface';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';

@Injectable()
export class NodesService {
  constructor(private readonly nodesRepository: NodesRepository) {}

  async findAll() {
    return this.nodesRepository.findAll();
  }

  async findOne(id: string) {
    return this.nodesRepository.findOne(id);
  }

  async create(createNodeDto: CreateNodeDto) {
    return this.nodesRepository.create(createNodeDto);
  }

  async update(id: string, updateNodeDto: UpdateNodeDto) {
    return this.nodesRepository.update(id, updateNodeDto);
  }

  async remove(id: string) {
    return this.nodesRepository.remove(id);
  }

  async getDashboardStats(id: string) {
    return this.nodesRepository.getDashboardStats(id);
  }
}
