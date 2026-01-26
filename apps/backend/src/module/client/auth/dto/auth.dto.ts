import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CheckLoginDto {
  @ApiProperty({ description: '微信登录临时凭证 code' })
  @IsNotEmpty({ message: 'code不能为空' })
  @IsString()
  code: string;
}

export class UserInfoObj {
  @ApiProperty()
  nickName: string;

  @ApiProperty()
  avatarUrl: string;
}

/**
 * 简化注册 DTO - 无需手机号
 */
export class RegisterDto {
  @ApiProperty({ description: '微信登录临时凭证 code (用于换取OpenID)' })
  @IsNotEmpty({ message: 'loginCode不能为空' })
  @IsString()
  loginCode: string;

  @ApiProperty({ description: '当前定位到的租户ID', required: false })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({ description: '推荐人ID', required: false })
  @IsOptional()
  @IsString()
  referrerId?: string;

  @ApiProperty({ description: '用户信息(昵称头像)', required: false })
  @IsOptional()
  @IsObject()
  userInfo?: UserInfoObj;
}

/**
 * 绑定手机号 DTO
 */
export class BindPhoneDto {
  @ApiProperty({ description: '手机号获取凭证 code (用于换取手机号)' })
  @IsNotEmpty({ message: 'phoneCode不能为空' })
  @IsString()
  phoneCode: string;
}

// 保留旧的 DTO 以便兼容（可后续删除）
export class RegisterMobileDto {
  @ApiProperty({ description: '微信登录临时凭证 code (用于换取OpenID)' })
  @IsNotEmpty({ message: 'loginCode不能为空' })
  @IsString()
  loginCode: string;

  @ApiProperty({ description: '手机号获取凭证 code (用于换取手机号)' })
  @IsNotEmpty({ message: 'phoneCode不能为空' })
  @IsString()
  phoneCode: string;

  @ApiProperty({ description: '当前定位到的租户ID' })
  @IsNotEmpty({ message: 'tenantId不能为空' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: '推荐人ID', required: false })
  @IsOptional()
  @IsString()
  referrerId?: string;

  @ApiProperty({ description: '用户信息(昵称头像)', required: false })
  @IsOptional()
  @IsObject()
  userInfo?: UserInfoObj;
}
