import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarketingEvent, MarketingEventType } from './marketing-event.types';

/**
 * 营销事件发射器服务
 *
 * @description
 * 封装 NestJS EventEmitter2，提供统一的事件发送接口。
 * 负责：
 * 1. 发送营销事件（同步/异步）
 * 2. 记录事件日志
 * 3. 处理事件发送异常
 *
 * @example
 * // 同步发送事件
 * await eventEmitter.emit({
 *   type: MarketingEventType.INSTANCE_SUCCESS,
 *   instanceId: 'xxx',
 *   configId: 'yyy',
 *   memberId: 'zzz',
 *   payload: { orderSn: 'xxx', amount: 199 },
 *   timestamp: new Date(),
 * });
 *
 * // 异步发送事件（不等待监听器处理完成）
 * await eventEmitter.emitAsync({
 *   type: MarketingEventType.INSTANCE_CREATED,
 *   instanceId: 'xxx',
 *   configId: 'yyy',
 *   memberId: 'zzz',
 *   payload: {},
 *   timestamp: new Date(),
 * });
 */
@Injectable()
export class MarketingEventEmitter {
  private readonly logger = new Logger(MarketingEventEmitter.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * 发送营销事件（同步）
   *
   * @description
   * 同步发送事件，等待所有监听器处理完成后返回。
   * 适用于需要确保事件处理完成的场景。
   *
   * @param event 营销事件数据
   * @returns Promise<void>
   *
   * @example
   * await eventEmitter.emit({
   *   type: MarketingEventType.INSTANCE_SUCCESS,
   *   instanceId: 'xxx',
   *   configId: 'yyy',
   *   memberId: 'zzz',
   *   payload: { orderSn: 'xxx', amount: 199 },
   *   timestamp: new Date(),
   * });
   */
  async emit(event: MarketingEvent): Promise<void> {
    try {
      // 记录事件发送日志
      this.logger.log(
        `[事件发送] 类型: ${event.type}, 实例: ${event.instanceId}, 用户: ${event.memberId}`,
      );

      // 记录详细的事件数据（调试用）
      this.logger.debug(`[事件详情] ${JSON.stringify(event)}`);

      // 发送事件到所有监听器
      await this.eventEmitter.emitAsync(event.type, event);

      // 记录发送成功日志
      this.logger.log(`[事件发送成功] 类型: ${event.type}, 实例: ${event.instanceId}`);
    } catch (error) {
      // 记录发送失败日志
      this.logger.error(
        `[事件发送失败] 类型: ${event.type}, 实例: ${event.instanceId}, 错误: ${error.message}`,
        error.stack,
      );

      // 不抛出异常，避免影响主流程
      // 事件发送失败不应该导致业务逻辑失败
    }
  }

  /**
   * 发送营销事件（异步）
   *
   * @description
   * 异步发送事件，不等待监听器处理完成即返回。
   * 适用于不需要等待事件处理的场景，提升性能。
   *
   * @param event 营销事件数据
   * @returns Promise<void>
   *
   * @example
   * await eventEmitter.emitAsync({
   *   type: MarketingEventType.INSTANCE_CREATED,
   *   instanceId: 'xxx',
   *   configId: 'yyy',
   *   memberId: 'zzz',
   *   payload: {},
   *   timestamp: new Date(),
   * });
   */
  async emitAsync(event: MarketingEvent): Promise<void> {
    try {
      // 记录事件发送日志
      this.logger.log(
        `[异步事件发送] 类型: ${event.type}, 实例: ${event.instanceId}, 用户: ${event.memberId}`,
      );

      // 记录详细的事件数据（调试用）
      this.logger.debug(`[事件详情] ${JSON.stringify(event)}`);

      // 异步发送事件，不等待监听器处理完成
      // 使用 setImmediate 确保事件在下一个事件循环中处理
      setImmediate(async () => {
        try {
          await this.eventEmitter.emitAsync(event.type, event);
          this.logger.log(`[异步事件发送成功] 类型: ${event.type}, 实例: ${event.instanceId}`);
        } catch (error) {
          this.logger.error(
            `[异步事件处理失败] 类型: ${event.type}, 实例: ${event.instanceId}, 错误: ${error.message}`,
            error.stack,
          );
        }
      });
    } catch (error) {
      // 记录发送失败日志
      this.logger.error(
        `[异步事件发送失败] 类型: ${event.type}, 实例: ${event.instanceId}, 错误: ${error.message}`,
        error.stack,
      );

      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 批量发送事件
   *
   * @description
   * 批量发送多个事件，提升性能。
   * 所有事件异步发送，不等待处理完成。
   *
   * @param events 事件列表
   * @returns Promise<void>
   *
   * @example
   * await eventEmitter.emitBatch([
   *   { type: MarketingEventType.INSTANCE_CREATED, ... },
   *   { type: MarketingEventType.INSTANCE_PAID, ... },
   * ]);
   */
  async emitBatch(events: MarketingEvent[]): Promise<void> {
    this.logger.log(`[批量事件发送] 数量: ${events.length}`);

    // 并发发送所有事件
    await Promise.all(events.map((event) => this.emitAsync(event)));

    this.logger.log(`[批量事件发送完成] 数量: ${events.length}`);
  }

  /**
   * 发送特定类型的事件（便捷方法）
   *
   * @description
   * 提供便捷的事件发送方法，简化常用事件的发送。
   */

  /**
   * 发送实例创建事件
   */
  async emitInstanceCreated(
    instanceId: string,
    configId: string,
    memberId: string,
    payload: any,
  ): Promise<void> {
    await this.emit({
      type: MarketingEventType.INSTANCE_CREATED,
      instanceId,
      configId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * 发送实例支付成功事件
   */
  async emitInstancePaid(
    instanceId: string,
    configId: string,
    memberId: string,
    payload: any,
  ): Promise<void> {
    await this.emit({
      type: MarketingEventType.INSTANCE_PAID,
      instanceId,
      configId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * 发送实例成功事件
   */
  async emitInstanceSuccess(
    instanceId: string,
    configId: string,
    memberId: string,
    payload: any,
  ): Promise<void> {
    await this.emit({
      type: MarketingEventType.INSTANCE_SUCCESS,
      instanceId,
      configId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * 发送实例失败事件
   */
  async emitInstanceFailed(
    instanceId: string,
    configId: string,
    memberId: string,
    payload: any,
  ): Promise<void> {
    await this.emit({
      type: MarketingEventType.INSTANCE_FAILED,
      instanceId,
      configId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * 发送实例超时事件
   */
  async emitInstanceTimeout(
    instanceId: string,
    configId: string,
    memberId: string,
    payload: any,
  ): Promise<void> {
    await this.emit({
      type: MarketingEventType.INSTANCE_TIMEOUT,
      instanceId,
      configId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * 发送实例退款事件
   */
  async emitInstanceRefunded(
    instanceId: string,
    configId: string,
    memberId: string,
    payload: any,
  ): Promise<void> {
    await this.emit({
      type: MarketingEventType.INSTANCE_REFUNDED,
      instanceId,
      configId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }
}

