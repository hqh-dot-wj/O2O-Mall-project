import { IsNumber, IsOptional, IsBoolean, Min, IsInt, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MemberUpgradeRulesDto {
  @ApiProperty({ description: '目标等级 (1=Level1, 2=Level2)' })
  @IsInt({ message: '等级必须是整数' })
  @IsIn([1, 2], { message: '目标等级必须是 1 或 2' })
  targetLevel: number;

  @ApiProperty({ description: '升级价格' })
  @IsNumber()
  @Min(0.01, { message: '价格必须大于0' })
  price: number;

  @ApiProperty({ description: '是否自动通过审批', default: true })
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;
}
