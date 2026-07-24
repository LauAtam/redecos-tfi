import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteAccountRequestDto {
  @ApiProperty({ example: 'Quiero eliminar mis datos por motivos de privacidad.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
