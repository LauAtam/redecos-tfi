import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCardDto {
  @ApiProperty({ description: 'Mercado Pago card token generated in frontend' })
  @IsNotEmpty({ message: 'El token de tarjeta es obligatorio.' })
  @IsString()
  token: string;
}
