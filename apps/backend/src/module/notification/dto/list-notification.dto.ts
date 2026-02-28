import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';

export class ListNotificationDto extends PageQueryDto {
  @ApiProperty({ required: false, description: '渠道' })
  @IsOptional()
  @IsString()
  @IsIn(['IN_APP', 'SMS', 'WECHAT_TEMPLATE', 'APP_PUSH'])
  channel?: string;

  @ApiProperty({ required: false, description: '状态' })
  @IsOptional()
  @IsString()
  @IsIn(['QUEUED', 'SENDING', 'SENT', 'FAILED'])
  status?: string;
}
