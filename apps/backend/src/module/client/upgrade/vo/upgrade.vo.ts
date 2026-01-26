import { ApiProperty } from '@nestjs/swagger';

export class UpgradeApplyVo {
  @ApiProperty({ description: '申请ID' })
  id: string;

  @ApiProperty({ description: '原等级' })
  fromLevel: number;

  @ApiProperty({ description: '目标等级' })
  toLevel: number;

  @ApiProperty({ description: '申请类型' })
  applyType: string;

  @ApiProperty({ description: '状态: PENDING/APPROVED/REJECTED' })
  status: string;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;
}

export class ReferralCodeVo {
  @ApiProperty({ description: '推荐码' })
  code: string;

  @ApiProperty({ description: '二维码URL (小程序码)' })
  qrCodeUrl: string | null;

  @ApiProperty({ description: '使用次数' })
  usageCount: number;
}

export class TeamStatsVo {
  @ApiProperty({ description: '我的等级' })
  myLevel: number;

  @ApiProperty({ description: '直接下级数量' })
  directCount: number;

  @ApiProperty({ description: '间接下级数量' })
  indirectCount: number;

  @ApiProperty({ description: '团队总业绩' })
  totalTeamSales: number;
}
