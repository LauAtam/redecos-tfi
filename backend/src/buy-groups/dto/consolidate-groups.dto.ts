import { IsUUID, IsArray, IsOptional } from 'class-validator';

export class ConsolidateGroupsDto {
  @IsUUID('4', { message: 'El ID del nodo debe ser un UUID válido.' })
  nodeId: string;

  @IsOptional()
  @IsArray({ message: 'Los IDs de los grupos deben ser una lista.' })
  @IsUUID('4', { each: true, message: 'Cada ID de grupo debe ser un UUID válido.' })
  groupIds?: string[];
}
