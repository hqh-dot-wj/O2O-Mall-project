import { ApiProperty } from '@nestjs/swagger';
import { ProductType, PublishStatus, MarketingStockMode } from '@prisma/client';

export class StorePlayConfigVo {
  @ApiProperty({ description: '记录ID' })
  id: string;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '门店ID' })
  storeId: string;

  @ApiProperty({ description: '服务/商品ID' })
  serviceId: string;

  @ApiProperty({ description: '服务类型', enum: ProductType })
  serviceType: ProductType;

  @ApiProperty({ description: '玩法模板编码' })
  templateCode: string;

  @ApiProperty({ description: '营销规则配置' })
  rules: any;

  @ApiProperty({ description: '库存策略', enum: MarketingStockMode })
  stockMode: MarketingStockMode;

  @ApiProperty({ description: '上下架状态', enum: PublishStatus })
  status: PublishStatus;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}

export class StorePlayConfigListVo {
  @ApiProperty({ description: '配置列表', type: [StorePlayConfigVo] })
  rows: StorePlayConfigVo[];

  @ApiProperty({ description: '总条数' })
  total: number;
}
