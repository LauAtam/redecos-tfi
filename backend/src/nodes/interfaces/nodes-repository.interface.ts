import { CreateNodeDto } from '../dto/create-node.dto';
import { UpdateNodeDto } from '../dto/update-node.dto';

export abstract class NodesRepository {
  abstract findAll(): Promise<any[]>;
  abstract findOne(id: string): Promise<any>;
  abstract create(createNodeDto: CreateNodeDto): Promise<any>;
  abstract update(id: string, updateNodeDto: UpdateNodeDto): Promise<any>;
  abstract remove(id: string): Promise<{ deleted: boolean }>;
  abstract getDashboardStats(id: string): Promise<any>;

  // Métodos para flujo de entrega QR/OTP
  abstract generateWithdrawalOtp(profileId: string): Promise<any>;
  abstract getClientPendingOrders(profileId: string, nodeId: string): Promise<any[]>;
  abstract confirmDelivery(profileId: string, otp: string, orderIds: string[], nodeManagerProfileId: string): Promise<any>;
}

