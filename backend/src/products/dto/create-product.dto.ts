import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  bulk_size: number;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  retail_price?: number;
}

