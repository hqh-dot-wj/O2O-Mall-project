/**
 * 错误处理工具函数
 * 从 unknown 类型的 catch 中安全提取 message / stack
 */

/** 安全获取错误信息字符串 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    return msg != null ? String(msg) : String(error);
  }
  return String(error);
}

/** 安全获取错误堆栈（仅 Error 实例有 stack） */
export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

/** 返回 { message, stack? }，便于 logger.error(msg, stack) */
export function getErrorInfo(error: unknown): { message: string; stack?: string } {
  return {
    message: getErrorMessage(error),
    stack: getErrorStack(error),
  };
}
