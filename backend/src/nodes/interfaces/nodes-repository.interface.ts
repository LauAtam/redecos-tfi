import { CreateNodeDto } from '../dto/create-node.dto';
import { UpdateNodeDto } from '../dto/update-node.dto';

export abstract class NodesRepository {
  abstract findAll(): Promise<any[]>;
  abstract findOne(id: string): Promise<any>;
  abstract create(createNodeDto: CreateNodeDto): Promise<any>;
  abstract update(id: string, updateNodeDto: UpdateNodeDto): Promise<any>;
  abstract remove(id: string): Promise<{ deleted: boolean }>;
}
