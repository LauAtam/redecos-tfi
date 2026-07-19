import { IsNotEmpty, IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class ConfirmDeliveryDto {
  @IsString()
  @IsNotEmpty()
  profileId: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderIds: string[];
}
