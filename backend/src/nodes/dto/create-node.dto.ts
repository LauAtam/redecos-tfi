import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNodeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  manager_name: string;
}
