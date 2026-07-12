export class NodeInfoDto {
  id: string;
  name: string;
  address: string;
  manager_name: string;
}

export class NodeStatsCountsDto {
  processingOrderCount: number;
  shippedCount: number;
  readyForPickupCount: number;
  completedCount: number;
  finalizedCount: number;
}

export class NodeDashboardStatsDto {
  node: NodeInfoDto;
  stats: NodeStatsCountsDto;
}
