import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';

export class CommissionPreviewDto {
  @ApiProperty({ description: '下单门店ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: '商品ID列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({ description: '分享人ID (可选)', required: false })
  @IsOptional()
  @IsString()
  shareUserId?: string;
}

export class CommissionPreviewVo {
  @ApiProperty({ description: '门店名称' })
  tenantName: string;

  @ApiProperty({ description: '佣金比例' })
  commissionRate: string;

  @ApiProperty({ description: '是否本店推荐人' })
  isLocalReferrer: boolean;

  @ApiProperty({ description: '门店是否开启跨店分销' })
  isCrossEnabled: boolean;

  @ApiProperty({ description: '预估佣金金额' })
  estimatedAmount: number;

  @ApiProperty({ description: '提示文案 (跨店时显示)', required: false })
  notice?: string;
}
