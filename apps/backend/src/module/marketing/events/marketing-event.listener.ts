import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MarketingEvent, MarketingEventType } from './marketing-event.types';
import { getErrorMessage, getErrorStack } from 'src/common/utils/error';

/**
 * 营销事件监听器
 *
 * @description
 * 监听营销系统中的各种事件，执行对应的业务逻辑。
 * 核心原则：
 * 1. 单个监听器失败不影响其他监听器
 * 2. 监听器处理异常不影响主流程
 * 3. 预留扩展点，便于后续添加业务逻辑
 *
 * @example
 * // 事件会自动触发对应的监听器方法
 * // 无需手动调用
 */
@Injectable()
export class MarketingEventListener {
  private readonly logger = new Logger(MarketingEventListener.name);

  /**
   * 处理实例创建事件
   *
   * @description
   * 当用户参与活动创建实例后触发。
   * 当前功能：
   * - 记录创建日志
   *
   * 扩展点：
   * - 用户行为分析
   * - 数据统计
   * - 风控检查
   *
   * @param event 营销事件数据
   */
  @OnEvent(MarketingEventType.INSTANCE_CREATED)
  async handleInstanceCreated(event: MarketingEvent): Promise<void> {
    try {
      this.logger.log(
        `[实例创建] 实例ID: ${event.instanceId}, 用户: ${event.memberId}, 配置: ${event.configId}`,
      );

      // TODO: 扩展点 - 用户行为分析
      // await this.analyticsService.trackUserAction(event);

      // TODO: 扩展点 - 数据统计
      // await this.statsService.incrementParticipation(event.configId);

      // TODO: 扩展点 - 风控检查
      // await this.riskControlService.checkUserBehavior(event.memberId);
    } catch (error) {
      // 异常处理：记录错误但不抛出，避免影响其他监听器
      this.logger.error(
        `[实例创建事件处理失败] 实例: ${event.instanceId}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  /**
   * 处理实例支付成功事件
   *
   * @description
   * 当用户完成支付后触发。
   * 当前功能：
   * - 记录支付成功日志
   *
   * 扩展点：
   * - 触发玩法特定逻辑（如拼团检查）
   * - 更新订单状态
   * - 发送支付成功通知
   *
   * @param event 营销事件数据
   */
  @OnEvent(MarketingEventType.INSTANCE_PAID)
  async handleInstancePaid(event: MarketingEvent): Promise<void> {
    try {
      this.logger.log(
        `[实例支付成功] 实例ID: ${event.instanceId}, 用户: ${event.memberId}, 金额: ${event.payload?.amount || '未知'}`,
      );

      // TODO: 扩展点 - 触发玩法特定逻辑
      // if (event.payload?.playType === 'GROUP_BUY') {
      //   await this.groupBuyService.checkGroupStatus(event.payload.groupId);
      // }

      // TODO: 扩展点 - 更新订单状态
      // await this.orderService.updateStatus(event.payload.orderSn, 'PAID');

      // TODO: 扩展点 - 发送支付成功通知
      // await this.notificationService.sendPaymentSuccess(event.memberId, event.payload);
    } catch (error) {
      this.logger.error(
        `[实例支付成功事件处理失败] 实例: ${event.instanceId}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  /**
   * 处理实例成功事件
   *
   * @description
   * 当活动条件达成，实例成功后触发。
   * 当前功能：
   * - 记录成功日志
   *
   * 扩展点：
   * - 发放权益（课程、会员、优惠券等）
   * - 结算资金
   * - 发送成功通知
   * - 记录审计日志
   *
   * @param event 营销事件数据
   */
  @OnEvent(MarketingEventType.INSTANCE_SUCCESS)
  async handleInstanceSuccess(event: MarketingEvent): Promise<void> {
    try {
      this.logger.log(
        `[实例成功] 实例ID: ${event.instanceId}, 用户: ${event.memberId}, 配置: ${event.configId}`,
      );

      this.logger.debug(`[实例成功详情] ${JSON.stringify(event.payload)}`);

      // TODO: 扩展点 - 发放权益
      // 根据活动类型发放不同的权益
      // if (event.payload?.assetType === 'COURSE') {
      //   await this.assetService.grantCourse(event.memberId, event.payload.assetId);
      // } else if (event.payload?.assetType === 'MEMBER') {
      //   await this.assetService.grantMembership(event.memberId, event.payload.assetId);
      // } else if (event.payload?.assetType === 'COUPON') {
      //   await this.assetService.grantCoupon(event.memberId, event.payload.assetId);
      // }

      // TODO: 扩展点 - 结算资金
      // await this.walletService.settle({
      //   orderSn: event.payload.orderSn,
      //   amount: event.payload.amount,
      //   storeId: event.payload.storeId,
      // });

      // TODO: 扩展点 - 发送成功通知
      // await this.notificationService.sendActivitySuccess(event.memberId, {
      //   activityName: event.payload.activityName,
      //   assetName: event.payload.assetName,
      // });

      // TODO: 扩展点 - 记录审计日志
      // await this.auditService.log({
      //   action: 'INSTANCE_SUCCESS',
      //   instanceId: event.instanceId,
      //   memberId: event.memberId,
      //   timestamp: event.timestamp,
      //   payload: event.payload,
      // });
    } catch (error) {
      this.logger.error(
        `[实例成功事件处理失败] 实例: ${event.instanceId}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  /**
   * 处理实例失败事件
   *
   * @description
   * 当活动条件未达成，实例失败后触发。
   * 当前功能：
   * - 记录失败日志
   *
   * 扩展点：
   * - 触发退款流程
   * - 发送失败通知
   * - 记录失败原因
   *
   * @param event 营销事件数据
   */
  @OnEvent(MarketingEventType.INSTANCE_FAILED)
  async handleInstanceFailed(event: MarketingEvent): Promise<void> {
    try {
      this.logger.log(
        `[实例失败] 实例ID: ${event.instanceId}, 用户: ${event.memberId}, 原因: ${event.payload?.reason || '未知'}`,
      );

      this.logger.debug(`[实例失败详情] ${JSON.stringify(event.payload)}`);

      // TODO: 扩展点 - 触发退款流程
      // 根据活动规则决定是否自动退款
      // if (event.payload?.autoRefund) {
      //   await this.refundService.createRefund({
      //     orderSn: event.payload.orderSn,
      //     amount: event.payload.amount,
      //     reason: '活动失败自动退款',
      //   });
      // }

      // TODO: 扩展点 - 发送失败通知
      // await this.notificationService.sendActivityFailed(event.memberId, {
      //   activityName: event.payload.activityName,
      //   reason: event.payload.reason,
      //   refundInfo: event.payload.refundInfo,
      // });

      // TODO: 扩展点 - 记录失败原因
      // await this.analyticsService.trackActivityFailure({
      //   configId: event.configId,
      //   reason: event.payload.reason,
      //   timestamp: event.timestamp,
      // });
    } catch (error) {
      this.logger.error(
        `[实例失败事件处理失败] 实例: ${event.instanceId}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  /**
   * 处理实例超时事件
   *
   * @description
   * 当实例超过有效期后触发。
   * 当前功能：
   * - 记录超时日志
   *
   * 扩展点：
   * - 释放库存
   * - 触发退款（如果已支付）
   * - 发送超时通知
   *
   * @param event 营销事件数据
   */
  @OnEvent(MarketingEventType.INSTANCE_TIMEOUT)
  async handleInstanceTimeout(event: MarketingEvent): Promise<void> {
    try {
      this.logger.log(
        `[实例超时] 实例ID: ${event.instanceId}, 用户: ${event.memberId}, 类型: ${event.payload?.timeoutType || '未知'}`,
      );

      this.logger.debug(`[实例超时详情] ${JSON.stringify(event.payload)}`);

      // TODO: 扩展点 - 释放库存
      // 超时后需要释放占用的库存
      // if (event.payload?.stockLocked) {
      //   await this.stockService.release({
      //     configId: event.configId,
      //     quantity: event.payload.quantity,
      //   });
      // }

      // TODO: 扩展点 - 触发退款
      // 如果用户已支付但超时，需要退款
      // if (event.payload?.paid) {
      //   await this.refundService.createRefund({
      //     orderSn: event.payload.orderSn,
      //     amount: event.payload.amount,
      //     reason: '活动超时自动退款',
      //   });
      // }

      // TODO: 扩展点 - 发送超时通知
      // await this.notificationService.sendActivityTimeout(event.memberId, {
      //   activityName: event.payload.activityName,
      //   timeoutType: event.payload.timeoutType,
      // });
    } catch (error) {
      this.logger.error(
        `[实例超时事件处理失败] 实例: ${event.instanceId}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  /**
   * 处理实例退款事件
   *
   * @description
   * 当用户申请退款或系统自动退款后触发。
   * 当前功能：
   * - 记录退款日志
   *
   * 扩展点：
   * - 处理退款逻辑
   * - 发送退款通知
   * - 更新财务数据
   * - 回收已发放的权益
   *
   * @param event 营销事件数据
   */
  @OnEvent(MarketingEventType.INSTANCE_REFUNDED)
  async handleInstanceRefunded(event: MarketingEvent): Promise<void> {
    try {
      this.logger.log(
        `[实例退款] 实例ID: ${event.instanceId}, 用户: ${event.memberId}, 金额: ${event.payload?.amount || '未知'}`,
      );

      this.logger.debug(`[实例退款详情] ${JSON.stringify(event.payload)}`);

      // TODO: 扩展点 - 处理退款逻辑
      // await this.refundService.processRefund({
      //   orderSn: event.payload.orderSn,
      //   amount: event.payload.amount,
      //   reason: event.payload.reason,
      // });

      // TODO: 扩展点 - 发送退款通知
      // await this.notificationService.sendRefundSuccess(event.memberId, {
      //   orderSn: event.payload.orderSn,
      //   amount: event.payload.amount,
      //   refundTime: event.timestamp,
      // });

      // TODO: 扩展点 - 更新财务数据
      // await this.financeService.recordRefund({
      //   orderSn: event.payload.orderSn,
      //   amount: event.payload.amount,
      //   timestamp: event.timestamp,
      // });

      // TODO: 扩展点 - 回收已发放的权益
      // 如果用户已经获得权益，需要回收
      // if (event.payload?.assetGranted) {
      //   await this.assetService.revokeAsset(event.memberId, event.payload.assetId);
      // }
    } catch (error) {
      this.logger.error(
        `[实例退款事件处理失败] 实例: ${event.instanceId}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  /**
   * 处理拼团满员事件
   *
   * @description
   * 当拼团人数达到要求后触发。
   * 当前功能：
   * - 记录拼团满员日志
   *
   * 扩展点：
   * - 触发拼团成功逻辑
   * - 通知所有参团用户
   * - 更新拼团状态
   *
   * @param event 营销事件数据
   */
  @OnEvent(MarketingEventType.GROUP_FULL)
  async handleGroupFull(event: MarketingEvent): Promise<void> {
    try {
      this.logger.log(
        `[拼团满员] 团ID: ${event.payload?.groupId}, 配置: ${event.configId}, 参团人数: ${event.payload?.participants?.length || 0}`,
      );

      // TODO: 扩展点 - 触发拼团成功逻辑
      // await this.groupBuyService.handleGroupSuccess(event.payload.groupId);

      // TODO: 扩展点 - 通知所有参团用户
      // for (const memberId of event.payload.participants) {
      //   await this.notificationService.sendGroupSuccess(memberId, {
      //     groupId: event.payload.groupId,
      //     activityName: event.payload.activityName,
      //   });
      // }
    } catch (error) {
      this.logger.error(
        `[拼团满员事件处理失败] 团ID: ${event.payload?.groupId}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  /**
   * 处理拼团失败事件
   *
   * @description
   * 当拼团超时未满员后触发。
   * 当前功能：
   * - 记录拼团失败日志
   *
   * 扩展点：
   * - 触发退款流程
   * - 通知所有参团用户
   *
   * @param event 营销事件数据
   */
  @OnEvent(MarketingEventType.GROUP_FAILED)
  async handleGroupFailed(event: MarketingEvent): Promise<void> {
    try {
      this.logger.log(
        `[拼团失败] 团ID: ${event.payload?.groupId}, 配置: ${event.configId}, 原因: ${event.payload?.reason || '未知'}`,
      );

      // TODO: 扩展点 - 触发退款流程
      // for (const memberId of event.payload.participants) {
      //   await this.refundService.createRefund({
      //     memberId,
      //     groupId: event.payload.groupId,
      //     reason: '拼团失败自动退款',
      //   });
      // }

      // TODO: 扩展点 - 通知所有参团用户
      // for (const memberId of event.payload.participants) {
      //   await this.notificationService.sendGroupFailed(memberId, {
      //     groupId: event.payload.groupId,
      //     reason: event.payload.reason,
      //   });
      // }
    } catch (error) {
      this.logger.error(
        `[拼团失败事件处理失败] 团ID: ${event.payload?.groupId}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  /**
   * 处理秒杀售罄事件
   *
   * @description
   * 当秒杀商品库存为0后触发。
   * 当前功能：
   * - 记录秒杀售罄日志
   *
   * 扩展点：
   * - 关闭秒杀活动
   * - 更新前端展示
   * - 发送售罄通知
   *
   * @param event 营销事件数据
   */
  @OnEvent(MarketingEventType.FLASH_SALE_SOLD_OUT)
  async handleFlashSaleSoldOut(event: MarketingEvent): Promise<void> {
    try {
      this.logger.log(`[秒杀售罄] 配置: ${event.configId}, 商品: ${event.payload?.productName || '未知'}`);

      // TODO: 扩展点 - 关闭秒杀活动
      // await this.configService.updateStatus(event.configId, 'SOLD_OUT');

      // TODO: 扩展点 - 更新前端展示
      // await this.cacheService.set(`flash_sale:${event.configId}:status`, 'SOLD_OUT');

      // TODO: 扩展点 - 发送售罄通知
      // await this.notificationService.sendFlashSaleSoldOut(event.configId);
    } catch (error) {
      this.logger.error(
        `[秒杀售罄事件处理失败] 配置: ${event.configId}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  /**
   * 处理课程开班事件
   *
   * @description
   * 当拼班课程人数达到开班要求后触发。
   * 当前功能：
   * - 记录课程开班日志
   *
   * 扩展点：
   * - 通知所有学员
   * - 安排课程
   * - 发放学习资料
   *
   * @param event 营销事件数据
   */
  @OnEvent(MarketingEventType.COURSE_OPEN)
  async handleCourseOpen(event: MarketingEvent): Promise<void> {
    try {
      this.logger.log(
        `[课程开班] 课程: ${event.payload?.courseName || '未知'}, 学员数: ${event.payload?.studentCount || 0}`,
      );

      // TODO: 扩展点 - 通知所有学员
      // for (const memberId of event.payload.students) {
      //   await this.notificationService.sendCourseOpen(memberId, {
      //     courseName: event.payload.courseName,
      //     startTime: event.payload.startTime,
      //   });
      // }

      // TODO: 扩展点 - 安排课程
      // await this.courseService.scheduleCourse({
      //   courseId: event.payload.courseId,
      //   students: event.payload.students,
      //   startTime: event.payload.startTime,
      // });

      // TODO: 扩展点 - 发放学习资料
      // for (const memberId of event.payload.students) {
      //   await this.assetService.grantCourseMaterials(memberId, event.payload.courseId);
      // }
    } catch (error) {
      this.logger.error(
        `[课程开班事件处理失败] 课程: ${event.payload?.courseName}, 错误: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }
}
