import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsString, IsOptional, Min } from 'class-validator';

export class UpdateWalletDto {
  @ApiProperty({ description: '变动金额' })
  @IsNotEmpty({ message: '金额不能为空' })
  @IsNumber({}, { message: '金额必须为数字' })
  @Min(0.01, { message: '金额必须大于0' })
  amount: number;

  @ApiProperty({ description: '关联业务ID' })
  @IsNotEmpty({ message: '关联ID不能为空' })
  @IsString()
  relatedId: string;

  @ApiProperty({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
