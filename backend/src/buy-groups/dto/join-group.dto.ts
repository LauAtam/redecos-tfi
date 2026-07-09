import { IsUUID, IsInt, Min, IsString, IsEmail } from 'class-validator';

export class JoinGroupDto {
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido.' })
  productId: string;

  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad mínima es 1 unidad.' })
  quantity: number;

  @IsUUID('4', { message: 'El ID del nodo debe ser un UUID válido.' })
  nodeId: string;

  @IsString({ message: 'El token de pago debe ser una cadena.' })
  paymentToken: string;

  @IsString({ message: 'El ID del método de pago debe ser una cadena.' })
  paymentMethodId: string;

  @IsEmail({}, { message: 'El email del pagador debe ser un correo electrónico válido.' })
  cardholderEmail: string;
}
