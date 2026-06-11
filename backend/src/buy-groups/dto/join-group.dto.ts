import { IsUUID, IsInt, Min } from 'class-validator';

export class JoinGroupDto {
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido.' })
  productId: string;

  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad mínima es 1 unidad.' })
  quantity: number;

  @IsUUID('4', { message: 'El ID del nodo debe ser un UUID válido.' })
  nodeId: string;
}
