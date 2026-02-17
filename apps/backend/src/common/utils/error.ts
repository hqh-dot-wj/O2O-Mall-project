/**
 * 自定义错误工具函数
 * 从 unknown 类型的 catch 中安全提取 message / stack，避免 TS2339 与运行时异常
 */

/**
 * 安全获取错误信息字符串
 * - Error 实例 → error.message
 * - 带 message 属性的对象（如 axios 错误）→ 取 message
 * - 其他 → String(error)
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    return msg != null ? String(msg) : String(error);
  }
  return String(error);
}

/**
 * 安全获取错误堆栈（仅 Error 实例有 stack）
 */
export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

/**
 * 用于日志：返回 { message, stack? }，便于 logger.error(msg, stack)
 */
export function getErrorInfo(error: unknown): { message: string; stack?: string } {
  return {
    message: getErrorMessage(error),
    stack: getErrorStack(error),
  };
}
