import { ApiProperty } from '@nestjs/swagger';

export class ApplicationVo {
  @ApiProperty({ description: '申请ID' })
  id: number;

  @ApiProperty({ description: '会员ID' })
  memberId: string;

  @ApiProperty({ description: '申请理由' })
  applyReason?: string;

  @ApiProperty({ description: '状态' })
  status: string;

  @ApiProperty({ description: '审核人ID' })
  reviewerId?: string;

  @ApiProperty({ description: '审核时间' })
  reviewTime?: string;

  @ApiProperty({ description: '审核备注' })
  reviewRemark?: string;

  @ApiProperty({ description: '是否自动审核' })
  autoReviewed: boolean;

  @ApiProperty({ description: '创建时间' })
  createTime: string;
}

export class ApplicationStatusVo {
  @ApiProperty({ description: '是否有申请' })
  hasApplication: boolean;

  @ApiProperty({ description: '申请状态' })
  status?: string;

  @ApiProperty({ description: '申请时间' })
  applyTime?: string;

  @ApiProperty({ description: '审核时间' })
  reviewTime?: string;

  @ApiProperty({ description: '审核备注' })
  reviewRemark?: string;

  @ApiProperty({ description: '是否可以重新申请' })
  canReapply: boolean;
}

export class ReviewConfigVo {
  @ApiProperty({ description: '配置ID' })
  id: number;

  @ApiProperty({ description: '是否启用自动审核' })
  enableAutoReview: boolean;

  @ApiProperty({ description: '最小注册天数' })
  minRegisterDays: number;

  @ApiProperty({ description: '最小订单数' })
  minOrderCount: number;

  @ApiProperty({ description: '最小消费金额' })
  minOrderAmount: number;

  @ApiProperty({ description: '是否要求实名' })
  requireRealName: boolean;

  @ApiProperty({ description: '是否要求手机号' })
  requirePhone: boolean;

  @ApiProperty({ description: '创建时间' })
  createTime: string;
}
