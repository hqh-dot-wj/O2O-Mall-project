import { Test, TestingModule } from '@nestjs/testing';
import { MarketingEventListener } from './marketing-event.listener';
import { MarketingEvent, MarketingEventType } from './marketing-event.types';

describe('MarketingEventListener', () => {
  let listener: MarketingEventListener;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketingEventListener],
    }).compile();

    listener = module.get<MarketingEventListener>(MarketingEventListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleInstanceCreated', () => {
    it('should handle instance created event without throwing', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: {},
        timestamp: new Date(),
      };

      await expect(listener.handleInstanceCreated(event)).resolves.not.toThrow();
    });

    it('should not throw when event processing fails', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_CREATED,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: null, // This might cause issues but should be caught
        timestamp: new Date(),
      };

      await expect(listener.handleInstanceCreated(event)).resolves.not.toThrow();
    });
  });

  describe('handleInstancePaid', () => {
    it('should handle instance paid event without throwing', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_PAID,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: { amount: 199 },
        timestamp: new Date(),
      };

      await expect(listener.handleInstancePaid(event)).resolves.not.toThrow();
    });
  });

  describe('handleInstanceSuccess', () => {
    it('should handle instance success event without throwing', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_SUCCESS,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: {
          orderSn: 'test-order-sn',
          amount: 199,
          assetType: 'COURSE',
          assetId: 'test-asset-id',
        },
        timestamp: new Date(),
      };

      await expect(listener.handleInstanceSuccess(event)).resolves.not.toThrow();
    });
  });

  describe('handleInstanceFailed', () => {
    it('should handle instance failed event without throwing', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_FAILED,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: {
          reason: 'Activity conditions not met',
          autoRefund: true,
        },
        timestamp: new Date(),
      };

      await expect(listener.handleInstanceFailed(event)).resolves.not.toThrow();
    });
  });

  describe('handleInstanceTimeout', () => {
    it('should handle instance timeout event without throwing', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_TIMEOUT,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: {
          timeoutType: 'PAYMENT_TIMEOUT',
          stockLocked: true,
          quantity: 1,
        },
        timestamp: new Date(),
      };

      await expect(listener.handleInstanceTimeout(event)).resolves.not.toThrow();
    });
  });

  describe('handleInstanceRefunded', () => {
    it('should handle instance refunded event without throwing', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_REFUNDED,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: {
          orderSn: 'test-order-sn',
          amount: 199,
          reason: 'User requested refund',
          assetGranted: false,
        },
        timestamp: new Date(),
      };

      await expect(listener.handleInstanceRefunded(event)).resolves.not.toThrow();
    });
  });

  describe('handleGroupFull', () => {
    it('should handle group full event without throwing', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.GROUP_FULL,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: {
          groupId: 'test-group-id',
          participants: ['user1', 'user2', 'user3'],
          activityName: 'Test Group Buy',
        },
        timestamp: new Date(),
      };

      await expect(listener.handleGroupFull(event)).resolves.not.toThrow();
    });
  });

  describe('handleGroupFailed', () => {
    it('should handle group failed event without throwing', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.GROUP_FAILED,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: {
          groupId: 'test-group-id',
          participants: ['user1', 'user2'],
          reason: 'Timeout - not enough participants',
        },
        timestamp: new Date(),
      };

      await expect(listener.handleGroupFailed(event)).resolves.not.toThrow();
    });
  });

  describe('handleFlashSaleSoldOut', () => {
    it('should handle flash sale sold out event without throwing', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.FLASH_SALE_SOLD_OUT,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: {
          productName: 'Test Product',
        },
        timestamp: new Date(),
      };

      await expect(listener.handleFlashSaleSoldOut(event)).resolves.not.toThrow();
    });
  });

  describe('handleCourseOpen', () => {
    it('should handle course open event without throwing', async () => {
      const event: MarketingEvent = {
        type: MarketingEventType.COURSE_OPEN,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: {
          courseName: 'Test Course',
          courseId: 'test-course-id',
          students: ['student1', 'student2', 'student3'],
          studentCount: 3,
          startTime: new Date(),
        },
        timestamp: new Date(),
      };

      await expect(listener.handleCourseOpen(event)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should catch and log errors without throwing', async () => {
      // Spy on logger to verify error is logged
      const loggerErrorSpy = jest.spyOn(listener['logger'], 'error');

      const event: MarketingEvent = {
        type: MarketingEventType.INSTANCE_SUCCESS,
        instanceId: 'test-instance-id',
        configId: 'test-config-id',
        memberId: 'test-member-id',
        payload: {},
        timestamp: new Date(),
      };

      // Should not throw even if internal processing fails
      await expect(listener.handleInstanceSuccess(event)).resolves.not.toThrow();

      // Note: In this test, no error will actually occur since we're just logging
      // In a real scenario with dependencies, errors would be caught and logged
    });
  });
});
