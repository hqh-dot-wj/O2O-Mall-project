import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FinanceEvent, FinanceEventType } from './finance-event.types';
import { getErrorMessage, getErrorStack } from 'src/common/utils/error';

/**
 * 财务事件发射器服务
 *
 * @description
 * 封装 NestJS EventEmitter2，提供统一的事件发送接口。
 * 负责：
 * 1. 发送财务事件（同步/异步）
 * 2. 记录事件日志
 * 3. 处理事件发送异常
 */
@Injectable()
export class FinanceEventEmitter {
  private readonly logger = new Logger(FinanceEventEmitter.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * 发送财务事件（同步）
   *
   * @description
   * 同步发送事件，等待所有监听器处理完成后返回。
   * 适用于需要确保事件处理完成的场景。
   *
   * @param event 财务事件数据
   */
  async emit(event: FinanceEvent): Promise<void> {
    try {
      this.logger.log(
        `[事件发送] 类型: ${event.type}, 租户: ${event.tenantId}, 用户: ${event.memberId}`,
      );
      this.logger.debug(`[事件详情] ${JSON.stringify(event)}`);

      await this.eventEmitter.emitAsync(event.type, event);

      this.logger.log(`[事件发送成功] 类型: ${event.type}`);
    } catch (error) {
      this.logger.error(
        `[事件发送失败] 类型: ${event.type}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 发送财务事件（异步）
   *
   * @description
   * 异步发送事件，不等待监听器处理完成即返回。
   * 适用于不需要等待事件处理的场景，提升性能。
   *
   * @param event 财务事件数据
   */
  async emitAsync(event: FinanceEvent): Promise<void> {
    try {
      this.logger.log(
        `[异步事件发送] 类型: ${event.type}, 租户: ${event.tenantId}, 用户: ${event.memberId}`,
      );
      this.logger.debug(`[事件详情] ${JSON.stringify(event)}`);

      setImmediate(async () => {
        try {
          await this.eventEmitter.emitAsync(event.type, event);
          this.logger.log(`[异步事件发送成功] 类型: ${event.type}`);
        } catch (error) {
          this.logger.error(
            `[异步事件处理失败] 类型: ${event.type}, 错误: ${getErrorMessage(error)}`,
            getErrorStack(error),
          );
        }
      });
    } catch (error) {
      this.logger.error(
        `[异步事件发送失败] 类型: ${event.type}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  /**
   * 发送钱包余额增加事件
   */
  async emitBalanceIncreased(
    tenantId: string,
    memberId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.emitAsync({
      type: FinanceEventType.WALLET_BALANCE_INCREASED,
      tenantId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * 发送钱包余额扣减事件
   */
  async emitBalanceDecreased(
    tenantId: string,
    memberId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.emitAsync({
      type: FinanceEventType.WALLET_BALANCE_DECREASED,
      tenantId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * 发送待回收余额增加事件
   */
  async emitPendingRecoveryIncreased(
    tenantId: string,
    memberId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.emitAsync({
      type: FinanceEventType.WALLET_PENDING_RECOVERY_INCREASED,
      tenantId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * 发送佣金结算事件
   */
  async emitCommissionSettled(
    tenantId: string,
    memberId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.emitAsync({
      type: FinanceEventType.COMMISSION_SETTLED,
      tenantId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * 发送提现申请事件
   */
  async emitWithdrawalApplied(
    tenantId: string,
    memberId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.emitAsync({
      type: FinanceEventType.WITHDRAWAL_APPLIED,
      tenantId,
      memberId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * 发送结算批次完成事件
   */
  async emitSettlementBatchCompleted(
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.emitAsync({
      type: FinanceEventType.SETTLEMENT_BATCH_COMPLETED,
      tenantId,
      memberId: 'system',
      payload,
      timestamp: new Date(),
    });
  }
}
