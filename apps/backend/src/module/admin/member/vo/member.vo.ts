import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Member Status Enum
 * 1: Normal
 * 2: Disabled
 */
export const MemberStatusEnum = {
  NORMAL: '1',
  DISABLED: '2',
};

export class MemberVo {
  @ApiProperty({ description: 'Member ID' })
  memberId: string;

  @ApiProperty({ description: 'Nickname' })
  nickname: string;

  @ApiProperty({ description: 'Avatar URL' })
  avatar: string;

  @ApiProperty({ description: 'Mobile number' })
  mobile: string;

  @ApiProperty({ description: 'Status (1: Normal, 2: Disabled)' })
  status: string;

  @ApiProperty({ description: 'Registration Time' })
  createTime: Date;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'Tenant Name' })
  tenantName?: string;

  @ApiProperty({ description: 'Referrer ID' })
  referrerId?: string;

  @ApiProperty({ description: 'Referrer Name' })
  referrerName?: string;

  @ApiProperty({ description: 'Referrer Mobile' })
  referrerMobile?: string;

  @ApiProperty({ description: 'Indirect Referrer ID' })
  indirectReferrerId?: string;

  @ApiProperty({ description: 'Indirect Referrer Name' })
  indirectReferrerName?: string;

  @ApiProperty({ description: 'Indirect Referrer Mobile' })
  indirectReferrerMobile?: string;

  // --- Reserved Fields for Wallet (Future Use) ---

  @ApiProperty({ description: 'Wallet Balance (Reserved)', default: 0 })
  balance: number;

  @ApiProperty({ description: 'Total Commission (Reserved)', default: 0 })
  commission: number;

  @ApiProperty({ description: 'Order Count (Reserved)', default: 0 })
  orderCount: number;

  @ApiProperty({ description: 'Total Consumption', default: 0 })
  totalConsumption?: number;

  @ApiProperty({ description: 'Level ID (0: Member, 1: Captain, 2: Shareholder)' })
  levelId: number;

  @ApiProperty({ description: 'Level Name' })
  levelName?: string;
}

/**
 * 会员积分变动记录 VO（管理端列表）
 */
export class PointHistoryVo {
  @ApiProperty({ description: '记录 ID' })
  id: string;

  @ApiProperty({ description: '会员 ID' })
  memberId: string;

  @ApiProperty({ description: '变动积分（正增负减）' })
  changePoints: number;

  @ApiProperty({ description: '变动后积分' })
  afterPoints: number;

  @ApiProperty({ description: '变动类型' })
  type: string;

  @ApiPropertyOptional({ description: '类型描述' })
  typeName?: string;

  @ApiPropertyOptional({ description: '备注' })
  remark?: string;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;
}
