/** 通知渠道类型 */
export type NotificationChannel = 'IN_APP' | 'SMS' | 'WECHAT_TEMPLATE' | 'APP_PUSH';

/** 通知消息体 */
export interface NotificationMessage {
  title?: string;
  content: string;
  template?: string;
  params?: Record<string, string>;
  tenantId: string;
}

/** 发送结果 */
export interface SendResult {
  success: boolean;
  error?: string;
}
