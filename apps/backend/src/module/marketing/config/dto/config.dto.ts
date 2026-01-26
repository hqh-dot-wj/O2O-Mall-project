import { ApiProperty } from '@nestjs/swagger';
import { ProductType, PublishStatus, MarketingStockMode } from '@prisma/client';
import { IsEnum, IsJSON, IsNotEmpty, IsOptional, IsString, IsDecimal } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';

export class StorePlayConfigDto {
  @ApiProperty({ description: '门店ID' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ description: '服务/商品ID' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: '服务类型', enum: ProductType })
  @IsEnum(ProductType)
  serviceType: ProductType;

  @ApiProperty({ description: '玩法模板编码' })
  @IsString()
  @IsNotEmpty()
  templateCode: string;

  @ApiProperty({ description: '营销规则配置' })
  @IsNotEmpty()
  rules: Record<string, any>;

  @ApiProperty({ description: '库存策略 (自动计算)', enum: MarketingStockMode, required: false })
  @IsEnum(MarketingStockMode)
  @IsOptional()
  stockMode?: MarketingStockMode;

  @ApiProperty({ description: '上下架状态', enum: PublishStatus })
  @IsEnum(PublishStatus)
  @IsOptional()
  status?: PublishStatus;
}

export class CreateStorePlayConfigDto extends StorePlayConfigDto {}

export class UpdateStorePlayConfigDto extends StorePlayConfigDto {}

export class ListStorePlayConfigDto extends PageQueryDto {
  @ApiProperty({ description: '门店ID', required: false })
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiProperty({ description: '模板编码', required: false })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiProperty({ description: '状态', enum: PublishStatus, required: false })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;
}
