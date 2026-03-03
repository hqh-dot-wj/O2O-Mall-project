import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FinanceEventEmitter } from './finance-event.emitter';

/**
 * 财务事件模块
 *
 * @description
 * 提供财务系统的事件驱动能力，用于解耦模块依赖。
 */
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  providers: [FinanceEventEmitter],
  exports: [FinanceEventEmitter],
})
export class FinanceEventsModule {}
