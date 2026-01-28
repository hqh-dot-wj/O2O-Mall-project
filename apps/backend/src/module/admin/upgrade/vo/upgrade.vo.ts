import { ApiProperty } from '@nestjs/swagger';

/**
 * 升级申请记录 VO
 */
export class UpgradeApplyVo {
  @ApiProperty({ description: '申请 ID' })
  id: string;

  @ApiProperty({ description: '租户 ID' })
  tenantId: string;

  @ApiProperty({ description: '会员 ID' })
  memberId: string;

  @ApiProperty({ description: '原等级 ID' })
  fromLevel: number;

  @ApiProperty({ description: '原等级名称' })
  fromLevelName: string;

  @ApiProperty({ description: '目标等级 ID' })
  toLevel: number;

  @ApiProperty({ description: '目标等级名称' })
  toLevelName: string;

  @ApiProperty({ description: '申请类型: PRODUCT_PURCHASE/REFERRAL_CODE/MANUAL_ADJUST' })
  applyType: string;

  @ApiProperty({ description: '状态: PENDING/APPROVED/REJECTED' })
  status: string;

  @ApiProperty({ description: '关联订单 ID', required: false })
  orderId?: string;

  @ApiProperty({ description: '申请时间' })
  createTime: Date;

  @ApiProperty({ description: '会员概览信息' })
  member?: {
    nickname: string;
    mobile: string;
    avatar: string;
  };
}

/**
 * 升级审批统计 VO
 */
export class UpgradeStatsVo {
  @ApiProperty({ description: '待审批申请数' })
  pendingCount: number;

  @ApiProperty({ description: '总申请记录数' })
  totalCount: number;
}
