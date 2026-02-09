import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarketingEventEmitter } from './marketing-event.emitter';
import { MarketingEvent, MarketingEventType } from './marketing-event.types';

/**
 * 营销事件发射器单元测试
 * 
 * @description
 * 测试事件发射器的核心功能：
 * - 同步事件发送
 * - 异步事件发送
 * - 事件日志记录
 * - 异常处理（事件发送失败不影响主流程）
 * 
 * @验证需求 FR-4.2
 */
describe('MarketingEventEmitter', () => {
  let emitter: MarketingEventEmitter;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    // 创建 EventEmitter2 mock
    mockEventEmitter = {
      emitAsync: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingEventEmitter,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    emitter = module.get<MarketingEventEmitter>(MarketingEventEmitter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功创建事件发射器实例', () => {
    expect(emitter).toBeDefined();
  });

  describe('emit - 同步事件发送', () => {
    it('应该成功发送 INSTANCE_CREATED 事件', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: {},
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emit(event);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        MarketingEventType.INSTANCE_CREATED,
        event,
      );
    });

    it('应该成功发送 INSTANCE_PAID 事件', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_PAID,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: { amount: 199 },
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emit(event);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        MarketingEventType.INSTANCE_PAID,
        event,
      );
    });

    it('应该成功发送 INSTANCE_SUCCESS 事件', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_SUCCESS,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: { orderSn: 'order-123' },
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emit(event);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        MarketingEventType.INSTANCE_SUCCESS,
        event,
      );
    });

    it('应该成功发送 GROUP_FULL 事件', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.GROUP_FULL,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: { groupId: 'group-999' },
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emit(event);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        MarketingEventType.GROUP_FULL,
        event,
      );
    });

    it('事件发送失败不应该抛出异常', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: {},
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockRejectedValue(
        new Error('Event emission failed'),
      );

      await expect(emitter.emit(event)).resolves.not.toThrow();
    });

    it('应该记录事件发送日志', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: {},
        timestamp: new Date(),
      };

      const loggerSpy = jest.spyOn(emitter['logger'], 'log');
      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emit(event);

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('应该记录事件发送失败的错误日志', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: {},
        timestamp: new Date(),
      };

      const loggerErrorSpy = jest.spyOn(emitter['logger'], 'error');
      mockEventEmitter.emitAsync.mockRejectedValue(
        new Error('Event emission failed'),
      );

      await emitter.emit(event);

      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('emitAsync - 异步事件发送', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('应该成功异步发送 INSTANCE_CREATED 事件', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: {},
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emitAsync(event);

      // 等待 setImmediate 执行
      jest.runAllTimers();

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        MarketingEventType.INSTANCE_CREATED,
        event,
      );
    });

    it('应该记录异步事件发送日志', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: {},
        timestamp: new Date(),
      };

      const loggerSpy = jest.spyOn(emitter['logger'], 'log');
      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emitAsync(event);

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('异步事件发送失败不应该抛出异常', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: {},
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockRejectedValue(
        new Error('Async event emission failed'),
      );

      await expect(emitter.emitAsync(event)).resolves.not.toThrow();
    });
  });

  describe('便捷方法测试', () => {
    it('emitInstanceCreated 应该正常工作', async () => {
      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emitInstanceCreated(
        'instance-123',
        'config-456',
        'member-789',
        {},
      );

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        MarketingEventType.INSTANCE_CREATED,
        expect.objectContaining({
          type: MarketingEventType.INSTANCE_CREATED,
          instanceId: 'instance-123',
          configId: 'config-456',
          memberId: 'member-789',
        }),
      );
    });

    it('emitInstancePaid 应该正常工作', async () => {
      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emitInstancePaid(
        'instance-123',
        'config-456',
        'member-789',
        { amount: 199 },
      );

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        MarketingEventType.INSTANCE_PAID,
        expect.objectContaining({
          type: MarketingEventType.INSTANCE_PAID,
          instanceId: 'instance-123',
        }),
      );
    });

    it('emitInstanceSuccess 应该正常工作', async () => {
      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emitInstanceSuccess(
        'instance-123',
        'config-456',
        'member-789',
        { orderSn: 'order-123' },
      );

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        MarketingEventType.INSTANCE_SUCCESS,
        expect.objectContaining({
          type: MarketingEventType.INSTANCE_SUCCESS,
          instanceId: 'instance-123',
        }),
      );
    });
  });

  describe('emitBatch - 批量发送事件', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('应该成功批量发送事件', async () => {
      const events: MarketingEvent[] = [
        {
          type: MarketingEventType.INSTANCE_CREATED,
          instanceId: 'instance-1',
          configId: 'config-456',
          memberId: 'member-789',
          payload: {},
          timestamp: new Date(),
        },
        {
          type: MarketingEventType.INSTANCE_PAID,
          instanceId: 'instance-2',
          configId: 'config-456',
          memberId: 'member-789',
          payload: {},
          timestamp: new Date(),
        },
      ];

      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await emitter.emitBatch(events);

      // 等待所有异步操作完成
      jest.runAllTimers();

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空 payload', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: {},
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await expect(emitter.emit(event)).resolves.not.toThrow();
    });

    it('应该处理 null payload', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: null as any,
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await expect(emitter.emit(event)).resolves.not.toThrow();
    });

    it('应该处理大型 payload', async () => {
      const largePayload = {
        data: 'x'.repeat(10000),
        nested: {
          array: Array(1000).fill({ key: 'value' }),
        },
      };

      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: largePayload,
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockResolvedValue([]);

      await expect(emitter.emit(event)).resolves.not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('同步事件发送应该很快（< 100ms）', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'instance-123',
        configId: 'config-456',
        memberId: 'member-789',
        payload: {},
        timestamp: new Date(),
      };

      mockEventEmitter.emitAsync.mockResolvedValue([]);

      const startTime = Date.now();
      await emitter.emit(event);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });
});
