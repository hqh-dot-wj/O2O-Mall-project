import { type Ref, ref, watch } from 'vue';

/**
 * 预览通信消息接口
 */
export interface PreviewMessage {
  type: 'MARKETING_PREVIEW_UPDATE' | 'PREVIEW_READY';
  payload: any;
}

/**
 * Iframe 实时预览 Hook
 *
 * @description
 * 负责 Admin 端与嵌入的 UniApp H5 Iframe 之间的 PostMessage 通信。
 * 实现了跨域数据同步，支持"所见即所得"的配置体验。
 *
 * @param iframeRef Iframe 元素的 Ref 引用
 * @param previewUrl 预览页面的 URL 地址
 */
export function usePreview(iframeRef: Ref<HTMLIFrameElement | null>, previewUrl: string) {
  const isReady = ref(false);

  /**
   * 发送消息到 Iframe
   * @param type 消息类型
   * @param payload 数据载荷
   */
  function send(type: string, payload: any) {
    if (!iframeRef.value?.contentWindow) return;

    // 发送消息到 Iframe
    // 注意: 使用 '*' 允许跨域通信 (方便开发)，生产环境建议指定具体的 Origin 提高安全性
    iframeRef.value.contentWindow.postMessage({ type, payload }, '*');
  }

  /**
   * 同步表单数据到预览页
   * @param model 表单数据模型
   */
  function syncForm(model: any) {
    send('MARKETING_PREVIEW_UPDATE', model);
  }

  return {
    isReady,
    send,
    syncForm
  };
}
