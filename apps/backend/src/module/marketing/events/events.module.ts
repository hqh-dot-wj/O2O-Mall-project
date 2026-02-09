import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MarketingEventEmitter } from './marketing-event.emitter';
import { MarketingEventListener } from './marketing-event.listener';

/**
 * 营销事件模块
 *
 * @description
 * 提供营销系统的事件驱动能力，包括：
 * 1. 事件发射器：用于发送事件
 * 2. 事件监听器：用于处理事件
 * 3. 事件类型定义：统一的事件数据结构
 *
 * 使用方式：
 * 1. 在需要发送事件的模块中导入 MarketingEventsModule
 * 2. 注入 MarketingEventEmitter 服务
 * 3. 调用 emit 或 emitAsync 方法发送事件
 *
 * @example
 * // 在其他模块中使用
 * @Module({
 *   imports: [MarketingEventsModule],
 * })
 * export class SomeModule {}
 *
 * // 在服务中注入
 * @Injectable()
 * export class SomeService {
 *   constructor(
 *     private readonly eventEmitter: MarketingEventEmitter,
 *   ) {}
 *
 *   async doSomething() {
 *     await this.eventEmitter.emit({
 *       type: MarketingEventType.INSTANCE_SUCCESS,
 *       instanceId: 'xxx',
 *       configId: 'yyy',
 *       memberId: 'zzz',
 *       payload: {},
 *       timestamp: new Date(),
 *     });
 *   }
 * }
 */
@Module({
  imports: [
    // 导入 NestJS 事件模块
    // maxListeners: 20 - 设置最大监听器数量，避免内存泄漏警告
    // wildcard: true - 支持通配符事件监听
    EventEmitterModule.forRoot({
      maxListeners: 20,
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [
    // 注册事件发射器
    MarketingEventEmitter,
    // 注册事件监听器
    MarketingEventListener,
  ],
  exports: [
    // 导出事件发射器，供其他模块使用
    MarketingEventEmitter,
  ],
})
export class MarketingEventsModule {}

