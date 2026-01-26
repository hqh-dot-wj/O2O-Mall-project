import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalStatus } from '@prisma/client';

export class WithdrawalVo {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '用户ID' })
  memberId: string;

  @ApiProperty({ description: '用户昵称' })
  memberName?: string;

  @ApiProperty({ description: '用户头像' })
  memberAvatar?: string;

  @ApiProperty({ description: '用户手机号' })
  memberMobile?: string;

  @ApiProperty({ description: '提现金额' })
  amount: string;

  @ApiProperty({ description: '提现方式' })
  method: string;

  @ApiProperty({ description: '提现状态', enum: WithdrawalStatus })
  status: WithdrawalStatus;

  @ApiProperty({ description: '真实姓名' })
  realName: string;

  @ApiProperty({ description: '审核人' })
  auditBy?: string;

  @ApiProperty({ description: '审核时间' })
  auditTime?: string;

  @ApiProperty({ description: '审核备注' })
  auditRemark?: string;

  @ApiProperty({ description: '支付单号' })
  paymentNo?: string;

  @ApiProperty({ description: '申请时间' })
  createTime: string;
}
