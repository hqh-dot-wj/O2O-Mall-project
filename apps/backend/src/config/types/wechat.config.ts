import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 单个微信平台配置（小程序/H5/App 等）
 */
export class WechatPlatformConfig {
  @IsString()
  @IsOptional()
  appid: string = '';

  @IsString()
  @IsOptional()
  secret: string = '';
}

/**
 * 微信多端配置
 *
 * @description
 * - appid / secret: 向后兼容，默认等同于 mpMall
 * - mpMall: 商城小程序（C端消费者）
 * - mpWork: 师傅小程序（Worker端）
 * - h5: H5 网页端（微信公众号/开放平台网页授权）
 *
 * 各平台 appid/secret 独立配置，未配置时 fallback 到顶层 appid/secret
 */
export class WechatConfig {
  /** @deprecated 向后兼容，建议使用 mpMall.appid */
  @IsString()
  @IsOptional()
  appid: string = '';

  /** @deprecated 向后兼容，建议使用 mpMall.secret */
  @IsString()
  @IsOptional()
  secret: string = '';

  /** 商城小程序（C端消费者） */
  @ValidateNested()
  @Type(() => WechatPlatformConfig)
  @IsOptional()
  mpMall: WechatPlatformConfig = new WechatPlatformConfig();

  /** 师傅小程序（Worker端） */
  @ValidateNested()
  @Type(() => WechatPlatformConfig)
  @IsOptional()
  mpWork: WechatPlatformConfig = new WechatPlatformConfig();

  /** H5 网页端 */
  @ValidateNested()
  @Type(() => WechatPlatformConfig)
  @IsOptional()
  h5: WechatPlatformConfig = new WechatPlatformConfig();
}
