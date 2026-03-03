import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 刷新令牌请求 DTO
 */
export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌', required: true })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  @IsString()
  refreshToken: string;
}
