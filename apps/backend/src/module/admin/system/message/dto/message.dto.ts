import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { PageQueryDto } from 'src/common/dto';

export class ListMessageDto extends PageQueryDto {
  @ApiProperty({ description: '消息类型', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: '读取状态', required: false })
  @IsOptional()
  @ApiProperty({ description: '读取状态', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isRead?: boolean;
}

export class CreateMessageDto {
  @ApiProperty({ description: '标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '内容', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '类型' })
  @IsString()
  type: string;

  @ApiProperty({ description: '接收人ID' })
  @IsString()
  receiverId: string;

  @ApiProperty({ description: '租户ID' })
  @IsString()
  tenantId: string;
}
