/**
 * 微信支付配置接口
 */
export interface WechatPayConfig {
  /** 小程序 AppId */
  appId: string;

  /** 商户号 */
  mchId: string;

  /** API 密钥（API v2） */
  apiKey: string;

  /** API v3 密钥 */
  apiV3Key: string;

  /** 商户证书序列号 */
  serialNo: string;

  /** 商户私钥路径 */
  privateKeyPath: string;

  /** 支付回调通知 URL */
  notifyUrl: string;

  /** 退款回调通知 URL */
  refundNotifyUrl: string;

  /** 是否启用沙箱环境 */
  sandbox: boolean;
}
