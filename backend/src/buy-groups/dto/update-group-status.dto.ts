import { IsString, IsIn } from 'class-validator';

export class UpdateGroupStatusDto {
  @IsString({ message: 'El estado debe ser una cadena de texto.' })
  @IsIn(
    ['OPEN', 'COMPLETED', 'PROCESSING_ORDER', 'SHIPPED', 'READY_FOR_PICKUP', 'FINALIZED', 'CANCELLED'],
    { message: 'El estado proporcionado no es un estado de grupo válido.' },
  )
  status: string;
}
