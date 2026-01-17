import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class UpdateProductPriceDto {
    @ApiProperty({ description: '店铺SKU ID' })
    @IsString()
    tenantSkuId: string;

    @ApiProperty({ description: '售价' })
    @IsNumber()
    price: number;

    @ApiProperty({ description: '分销费率/金额' })
    @IsNumber()
    distRate: number;
}
