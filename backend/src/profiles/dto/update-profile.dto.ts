import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID del nodo debe ser un UUID válido.' })
  default_node_id?: string;
}
