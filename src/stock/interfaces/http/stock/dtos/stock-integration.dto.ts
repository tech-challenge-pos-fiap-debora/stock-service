import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class StockDemandItemDto {
  @ApiProperty({ example: 'DEMO-OIL-01' })
  @IsString()
  productCode!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(0.01)
  required!: number;
}

export class StockDemandRequestDto {
  @ApiProperty({ type: [StockDemandItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockDemandItemDto)
  items!: StockDemandItemDto[];
}

export class StockQuoteItemDto {
  @ApiProperty()
  productCode!: string;

  @ApiProperty()
  required!: number;

  @ApiProperty({ description: 'Custo total FIFO' })
  totalCost!: number;

  @ApiProperty({ description: 'Preço unitário médio da cotação' })
  unitPrice!: number;
}

export class StockAvailabilityItemDto {
  @ApiProperty()
  productCode!: string;

  @ApiProperty()
  required!: number;

  @ApiProperty()
  available!: number;
}

export class StockDecreaseRequestDto {
  @ApiProperty({ example: 'DEMO-OIL-01' })
  @IsString()
  productCode!: string;

  @ApiProperty({ example: 1, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;
}
