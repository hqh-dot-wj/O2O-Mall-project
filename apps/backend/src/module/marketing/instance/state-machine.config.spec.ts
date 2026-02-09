import {
  isValidTransition,
  getStatusDescription,
  isFinalStatus,
  getAllowedNextStatuses,
  PLAY_INSTANCE_STATE_MACHINE,
} from './state-machine.config';
import { PlayInstanceStatus } from '@prisma/client';

/**
 * 状态机约束系统单元测试
 * 
 * @description
 * 测试状态机的核心功能：
 * - 状态跃迁合法性校验
 * - 状态描述获取
 * - 终态判断
 * - 允许的下一状态获取
 * 
 * @验证需求 FR-3.1, FR-3.2, US-7
 */
describe('StateMachine Config', () => {
  describe('isValidTransition - 状态跃迁合法性校验', () => {
    describe('合法的状态跃迁', () => {
      it('PENDING_PAY -> PAID 应该合法（支付成功）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PENDING_PAY,
            PlayInstanceStatus.PAID,
          ),
        ).toBe(true);
      });

      it('PENDING_PAY -> TIMEOUT 应该合法（支付超时）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PENDING_PAY,
            PlayInstanceStatus.TIMEOUT,
          ),
        ).toBe(true);
      });

      it('PENDING_PAY -> FAILED 应该合法（创建失败）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PENDING_PAY,
            PlayInstanceStatus.FAILED,
          ),
        ).toBe(true);
      });

      it('PAID -> ACTIVE 应该合法（进入活动）', () => {
        expect(
          isValidTransition(PlayInstanceStatus.PAID, PlayInstanceStatus.ACTIVE),
        ).toBe(true);
      });

      it('PAID -> SUCCESS 应该合法（直接成功）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PAID,
            PlayInstanceStatus.SUCCESS,
          ),
        ).toBe(true);
      });

      it('PAID -> REFUNDED 应该合法（用户退款）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PAID,
            PlayInstanceStatus.REFUNDED,
          ),
        ).toBe(true);
      });

      it('ACTIVE -> SUCCESS 应该合法（活动成功）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.ACTIVE,
            PlayInstanceStatus.SUCCESS,
          ),
        ).toBe(true);
      });

      it('ACTIVE -> FAILED 应该合法（活动失败）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.ACTIVE,
            PlayInstanceStatus.FAILED,
          ),
        ).toBe(true);
      });

      it('ACTIVE -> TIMEOUT 应该合法（活动超时）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.ACTIVE,
            PlayInstanceStatus.TIMEOUT,
          ),
        ).toBe(true);
      });

      it('ACTIVE -> REFUNDED 应该合法（用户退款）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.ACTIVE,
            PlayInstanceStatus.REFUNDED,
          ),
        ).toBe(true);
      });

      it('SUCCESS -> REFUNDED 应该合法（售后退款）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.SUCCESS,
            PlayInstanceStatus.REFUNDED,
          ),
        ).toBe(true);
      });

      it('FAILED -> REFUNDED 应该合法（失败退款）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.FAILED,
            PlayInstanceStatus.REFUNDED,
          ),
        ).toBe(true);
      });
    });

    describe('非法的状态跃迁', () => {
      it('PENDING_PAY -> ACTIVE 应该非法（必须先支付）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PENDING_PAY,
            PlayInstanceStatus.ACTIVE,
          ),
        ).toBe(false);
      });

      it('PENDING_PAY -> SUCCESS 应该非法（必须先支付）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PENDING_PAY,
            PlayInstanceStatus.SUCCESS,
          ),
        ).toBe(false);
      });

      it('PENDING_PAY -> REFUNDED 应该非法（未支付无法退款）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PENDING_PAY,
            PlayInstanceStatus.REFUNDED,
          ),
        ).toBe(false);
      });

      it('PAID -> TIMEOUT 应该非法（已支付不会超时）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PAID,
            PlayInstanceStatus.TIMEOUT,
          ),
        ).toBe(false);
      });

      it('PAID -> FAILED 应该非法（已支付不会直接失败）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PAID,
            PlayInstanceStatus.FAILED,
          ),
        ).toBe(false);
      });

      it('SUCCESS -> PENDING_PAY 应该非法（终态不能回退）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.SUCCESS,
            PlayInstanceStatus.PENDING_PAY,
          ),
        ).toBe(false);
      });

      it('SUCCESS -> PAID 应该非法（终态不能回退）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.SUCCESS,
            PlayInstanceStatus.PAID,
          ),
        ).toBe(false);
      });

      it('SUCCESS -> ACTIVE 应该非法（终态不能回退）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.SUCCESS,
            PlayInstanceStatus.ACTIVE,
          ),
        ).toBe(false);
      });

      it('SUCCESS -> FAILED 应该非法（终态不能回退）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.SUCCESS,
            PlayInstanceStatus.FAILED,
          ),
        ).toBe(false);
      });

      it('SUCCESS -> TIMEOUT 应该非法（终态不能回退）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.SUCCESS,
            PlayInstanceStatus.TIMEOUT,
          ),
        ).toBe(false);
      });

      it('TIMEOUT -> 任何状态 应该非法（终态不能跃迁）', () => {
        const allStatuses = Object.values(PlayInstanceStatus);
        allStatuses.forEach((status) => {
          if (status !== PlayInstanceStatus.TIMEOUT) {
            expect(
              isValidTransition(PlayInstanceStatus.TIMEOUT, status),
            ).toBe(false);
          }
        });
      });

      it('FAILED -> PENDING_PAY 应该非法（终态不能回退）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.FAILED,
            PlayInstanceStatus.PENDING_PAY,
          ),
        ).toBe(false);
      });

      it('FAILED -> PAID 应该非法（终态不能回退）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.FAILED,
            PlayInstanceStatus.PAID,
          ),
        ).toBe(false);
      });

      it('FAILED -> ACTIVE 应该非法（终态不能回退）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.FAILED,
            PlayInstanceStatus.ACTIVE,
          ),
        ).toBe(false);
      });

      it('FAILED -> SUCCESS 应该非法（终态不能回退）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.FAILED,
            PlayInstanceStatus.SUCCESS,
          ),
        ).toBe(false);
      });

      it('FAILED -> TIMEOUT 应该非法（终态不能回退）', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.FAILED,
            PlayInstanceStatus.TIMEOUT,
          ),
        ).toBe(false);
      });

      it('REFUNDED -> 任何状态 应该非法（终态不能跃迁）', () => {
        const allStatuses = Object.values(PlayInstanceStatus);
        allStatuses.forEach((status) => {
          if (status !== PlayInstanceStatus.REFUNDED) {
            expect(
              isValidTransition(PlayInstanceStatus.REFUNDED, status),
            ).toBe(false);
          }
        });
      });
    });

    describe('相同状态跃迁', () => {
      it('PENDING_PAY -> PENDING_PAY 应该非法', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.PENDING_PAY,
            PlayInstanceStatus.PENDING_PAY,
          ),
        ).toBe(false);
      });

      it('PAID -> PAID 应该非法', () => {
        expect(
          isValidTransition(PlayInstanceStatus.PAID, PlayInstanceStatus.PAID),
        ).toBe(false);
      });

      it('ACTIVE -> ACTIVE 应该非法', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.ACTIVE,
            PlayInstanceStatus.ACTIVE,
          ),
        ).toBe(false);
      });

      it('SUCCESS -> SUCCESS 应该非法', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.SUCCESS,
            PlayInstanceStatus.SUCCESS,
          ),
        ).toBe(false);
      });

      it('TIMEOUT -> TIMEOUT 应该非法', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.TIMEOUT,
            PlayInstanceStatus.TIMEOUT,
          ),
        ).toBe(false);
      });

      it('FAILED -> FAILED 应该非法', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.FAILED,
            PlayInstanceStatus.FAILED,
          ),
        ).toBe(false);
      });

      it('REFUNDED -> REFUNDED 应该非法', () => {
        expect(
          isValidTransition(
            PlayInstanceStatus.REFUNDED,
            PlayInstanceStatus.REFUNDED,
          ),
        ).toBe(false);
      });
    });
  });

  describe('getStatusDescription - 获取状态描述', () => {
    it('应该返回 PENDING_PAY 的中文描述', () => {
      const description = getStatusDescription(PlayInstanceStatus.PENDING_PAY);
      expect(description).toBe('待支付：用户已创建实例，等待支付完成');
    });

    it('应该返回 PAID 的中文描述', () => {
      const description = getStatusDescription(PlayInstanceStatus.PAID);
      expect(description).toBe('已支付：等待活动条件达成');
    });

    it('应该返回 ACTIVE 的中文描述', () => {
      const description = getStatusDescription(PlayInstanceStatus.ACTIVE);
      expect(description).toBe('活动中：等待活动最终结果');
    });

    it('应该返回 SUCCESS 的中文描述', () => {
      const description = getStatusDescription(PlayInstanceStatus.SUCCESS);
      expect(description).toBe('活动成功：权益已发放，资金已结算');
    });

    it('应该返回 TIMEOUT 的中文描述', () => {
      const description = getStatusDescription(PlayInstanceStatus.TIMEOUT);
      expect(description).toBe('超时关闭：用户未在规定时间内完成操作');
    });

    it('应该返回 FAILED 的中文描述', () => {
      const description = getStatusDescription(PlayInstanceStatus.FAILED);
      expect(description).toBe('活动失败：活动条件未达成');
    });

    it('应该返回 REFUNDED 的中文描述', () => {
      const description = getStatusDescription(PlayInstanceStatus.REFUNDED);
      expect(description).toBe('已退款：资金已退还给用户');
    });
  });

  describe('isFinalStatus - 判断是否终态', () => {
    it('PENDING_PAY 不应该是终态', () => {
      expect(isFinalStatus(PlayInstanceStatus.PENDING_PAY)).toBe(false);
    });

    it('PAID 不应该是终态', () => {
      expect(isFinalStatus(PlayInstanceStatus.PAID)).toBe(false);
    });

    it('ACTIVE 不应该是终态', () => {
      expect(isFinalStatus(PlayInstanceStatus.ACTIVE)).toBe(false);
    });

    it('SUCCESS 应该是终态', () => {
      expect(isFinalStatus(PlayInstanceStatus.SUCCESS)).toBe(true);
    });

    it('TIMEOUT 应该是终态', () => {
      expect(isFinalStatus(PlayInstanceStatus.TIMEOUT)).toBe(true);
    });

    it('FAILED 应该是终态（但可以退款）', () => {
      expect(isFinalStatus(PlayInstanceStatus.FAILED)).toBe(true);
    });

    it('REFUNDED 应该是终态', () => {
      expect(isFinalStatus(PlayInstanceStatus.REFUNDED)).toBe(true);
    });
  });

  describe('getAllowedNextStatuses - 获取允许的下一状态', () => {
    it('PENDING_PAY 应该允许跃迁到 PAID, TIMEOUT, FAILED', () => {
      const allowed = getAllowedNextStatuses(PlayInstanceStatus.PENDING_PAY);
      expect(allowed).toEqual([
        PlayInstanceStatus.PAID,
        PlayInstanceStatus.TIMEOUT,
        PlayInstanceStatus.FAILED,
      ]);
    });

    it('PAID 应该允许跃迁到 ACTIVE, SUCCESS, REFUNDED', () => {
      const allowed = getAllowedNextStatuses(PlayInstanceStatus.PAID);
      expect(allowed).toEqual([
        PlayInstanceStatus.ACTIVE,
        PlayInstanceStatus.SUCCESS,
        PlayInstanceStatus.REFUNDED,
      ]);
    });

    it('ACTIVE 应该允许跃迁到 SUCCESS, FAILED, TIMEOUT, REFUNDED', () => {
      const allowed = getAllowedNextStatuses(PlayInstanceStatus.ACTIVE);
      expect(allowed).toEqual([
        PlayInstanceStatus.SUCCESS,
        PlayInstanceStatus.FAILED,
        PlayInstanceStatus.TIMEOUT,
        PlayInstanceStatus.REFUNDED,
      ]);
    });

    it('SUCCESS 应该只允许跃迁到 REFUNDED', () => {
      const allowed = getAllowedNextStatuses(PlayInstanceStatus.SUCCESS);
      expect(allowed).toEqual([PlayInstanceStatus.REFUNDED]);
    });

    it('TIMEOUT 不应该允许跃迁到任何状态', () => {
      const allowed = getAllowedNextStatuses(PlayInstanceStatus.TIMEOUT);
      expect(allowed).toEqual([]);
    });

    it('FAILED 应该只允许跃迁到 REFUNDED', () => {
      const allowed = getAllowedNextStatuses(PlayInstanceStatus.FAILED);
      expect(allowed).toEqual([PlayInstanceStatus.REFUNDED]);
    });

    it('REFUNDED 不应该允许跃迁到任何状态', () => {
      const allowed = getAllowedNextStatuses(PlayInstanceStatus.REFUNDED);
      expect(allowed).toEqual([]);
    });
  });

  describe('PLAY_INSTANCE_STATE_MACHINE - 状态机配置完整性', () => {
    it('应该包含所有状态的配置', () => {
      const allStatuses = Object.values(PlayInstanceStatus);
      allStatuses.forEach((status) => {
        expect(PLAY_INSTANCE_STATE_MACHINE[status]).toBeDefined();
      });
    });

    it('每个状态配置应该包含必要字段', () => {
      Object.entries(PLAY_INSTANCE_STATE_MACHINE).forEach(
        ([status, config]) => {
          expect(config.allowedNext).toBeDefined();
          expect(Array.isArray(config.allowedNext)).toBe(true);
          expect(config.description).toBeDefined();
          expect(typeof config.description).toBe('string');
          expect(config.isFinal).toBeDefined();
          expect(typeof config.isFinal).toBe('boolean');
        },
      );
    });

    it('终态的 allowedNext 应该为空或只包含 REFUNDED', () => {
      const finalStatuses = [
        PlayInstanceStatus.SUCCESS,
        PlayInstanceStatus.TIMEOUT,
        PlayInstanceStatus.FAILED,
        PlayInstanceStatus.REFUNDED,
      ];

      finalStatuses.forEach((status) => {
        const config = PLAY_INSTANCE_STATE_MACHINE[status];
        expect(config.isFinal).toBe(true);
        if (config.allowedNext.length > 0) {
          expect(config.allowedNext).toEqual([PlayInstanceStatus.REFUNDED]);
        }
      });
    });

    it('非终态的 allowedNext 不应该为空', () => {
      const nonFinalStatuses = [
        PlayInstanceStatus.PENDING_PAY,
        PlayInstanceStatus.PAID,
        PlayInstanceStatus.ACTIVE,
      ];

      nonFinalStatuses.forEach((status) => {
        const config = PLAY_INSTANCE_STATE_MACHINE[status];
        expect(config.isFinal).toBe(false);
        expect(config.allowedNext.length).toBeGreaterThan(0);
      });
    });
  });

  describe('边界情况测试', () => {
    it('应该处理 undefined 状态', () => {
      expect(() =>
        isValidTransition(undefined as any, PlayInstanceStatus.PAID),
      ).not.toThrow();
      expect(
        isValidTransition(undefined as any, PlayInstanceStatus.PAID),
      ).toBe(false);
    });

    it('应该处理 null 状态', () => {
      expect(() =>
        isValidTransition(null as any, PlayInstanceStatus.PAID),
      ).not.toThrow();
      expect(isValidTransition(null as any, PlayInstanceStatus.PAID)).toBe(
        false,
      );
    });

    it('应该处理无效的状态字符串', () => {
      expect(() =>
        isValidTransition('INVALID_STATUS' as any, PlayInstanceStatus.PAID),
      ).not.toThrow();
      expect(
        isValidTransition('INVALID_STATUS' as any, PlayInstanceStatus.PAID),
      ).toBe(false);
    });
  });
});
