import { IsString, IsOptional } from 'class-validator';

export class WechatConfig {
  @IsString()
  @IsOptional()
  appid: string = '';

  @IsString()
  @IsOptional()
  secret: string = '';
}
