import { Test, TestingModule } from '@nestjs/testing';
import {
  ApprovalService,
  ActivityApprovalStatus,
} from './approval.service';

/**
 * 活动审批服务单元测试
 * 
 * @description
 * 测试审批服务的核心功能：
 * - 提交审批
 * - 审批通过
 * - 审批驳回
 * - 状态流转校验
 * - 状态描述获取
 * 
 * @验证需求 FR-7.3
 */
describe('ApprovalService', () => {
  let service: ApprovalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApprovalService],
    }).compile();

    service = module.get<ApprovalService>(ApprovalService);
  });

  it('应该成功创建服务实例', () => {
    expect(service).toBeDefined();
  });

  describe('submitApproval - 提交审批', () => {
    it('应该成功提交审批', async () => {
      const result = await service.submitApproval({
        configId: 'config-123',
        submitterId: 'user-456',
        remark: '请审批此活动',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(ActivityApprovalStatus.PENDING);
      expect(result.submitter).toBe('user-456');
      expect(result.submitTime).toBeDefined();
      expect(result.remark).toBe('请审批此活动');
    });

    it('应该记录提交时间', async () => {
      const beforeTime = new Date();
      
      const result = await service.submitApproval({
        configId: 'config-123',
        submitterId: 'user-456',
      });

      const afterTime = new Date();

      expect(result.submitTime).toBeDefined();
      expect(result.submitTime!.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(result.submitTime!.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      );
    });
  });

  describe('approve - 审批通过', () => {
    it('应该成功审批通过', async () => {
      const result = await service.approve({
        configId: 'config-123',
        approverId: 'admin-789',
        remark: '活动方案合理，批准上线',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(ActivityApprovalStatus.APPROVED);
      expect(result.approver).toBe('admin-789');
      expect(result.approvalTime).toBeDefined();
      expect(result.remark).toBe('活动方案合理，批准上线');
    });

    it('应该记录审批时间', async () => {
      const beforeTime = new Date();
      
      const result = await service.approve({
        configId: 'config-123',
        approverId: 'admin-789',
        remark: '批准',
      });

      const afterTime = new Date();

      expect(result.approvalTime).toBeDefined();
      expect(result.approvalTime!.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(result.approvalTime!.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      );
    });

    it('审批意见可以为空', async () => {
      const result = await service.approve({
        configId: 'config-123',
        approverId: 'admin-789',
      });

      expect(result.status).toBe(ActivityApprovalStatus.APPROVED);
      expect(result.remark).toBeUndefined();
    });
  });

  describe('reject - 审批驳回', () => {
    it('应该成功审批驳回', async () => {
      const result = await service.reject({
        configId: 'config-123',
        approverId: 'admin-789',
        remark: '折扣力度过大，请调整后重新提交',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(ActivityApprovalStatus.REJECTED);
      expect(result.approver).toBe('admin-789');
      expect(result.approvalTime).toBeDefined();
      expect(result.remark).toBe('折扣力度过大，请调整后重新提交');
    });

    it('驳回时必须提供驳回原因', async () => {
      await expect(
        service.reject({
          configId: 'config-123',
          approverId: 'admin-789',
          remark: '',
        }),
      ).rejects.toThrow('驳回审批必须提供驳回原因');
    });

    it('驳回原因不能只包含空格', async () => {
      await expect(
        service.reject({
          configId: 'config-123',
          approverId: 'admin-789',
          remark: '   ',
        }),
      ).rejects.toThrow('驳回审批必须提供驳回原因');
    });

    it('驳回原因不能为 undefined', async () => {
      await expect(
        service.reject({
          configId: 'config-123',
          approverId: 'admin-789',
          remark: undefined as any,
        }),
      ).rejects.toThrow('驳回审批必须提供驳回原因');
    });
  });

  describe('getApprovalStatus - 获取审批状态', () => {
    it('应该返回审批记录', async () => {
      const result = await service.getApprovalStatus('config-123');

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('默认状态应该是 DRAFT', async () => {
      const result = await service.getApprovalStatus('config-123');

      expect(result.status).toBe(ActivityApprovalStatus.DRAFT);
    });
  });

  describe('canPublish - 检查是否可以上线', () => {
    it('APPROVED 状态应该可以上线', async () => {
      // 模拟已审批通过的状态
      jest.spyOn(service, 'getApprovalStatus').mockResolvedValue({
        status: ActivityApprovalStatus.APPROVED,
        approver: 'admin-789',
        approvalTime: new Date(),
      });

      const canPublish = await service.canPublish('config-123');

      expect(canPublish).toBe(true);
    });

    it('DRAFT 状态不应该可以上线', async () => {
      jest.spyOn(service, 'getApprovalStatus').mockResolvedValue({
        status: ActivityApprovalStatus.DRAFT,
      });

      const canPublish = await service.canPublish('config-123');

      expect(canPublish).toBe(false);
    });

    it('PENDING 状态不应该可以上线', async () => {
      jest.spyOn(service, 'getApprovalStatus').mockResolvedValue({
        status: ActivityApprovalStatus.PENDING,
        submitTime: new Date(),
        submitter: 'user-456',
      });

      const canPublish = await service.canPublish('config-123');

      expect(canPublish).toBe(false);
    });

    it('REJECTED 状态不应该可以上线', async () => {
      jest.spyOn(service, 'getApprovalStatus').mockResolvedValue({
        status: ActivityApprovalStatus.REJECTED,
        approver: 'admin-789',
        approvalTime: new Date(),
        remark: '需要修改',
      });

      const canPublish = await service.canPublish('config-123');

      expect(canPublish).toBe(false);
    });
  });

  describe('isValidTransition - 状态流转校验', () => {
    describe('合法的状态流转', () => {
      it('DRAFT -> PENDING 应该合法（提交审批）', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.DRAFT,
          ActivityApprovalStatus.PENDING,
        );

        expect(isValid).toBe(true);
      });

      it('PENDING -> APPROVED 应该合法（审批通过）', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.PENDING,
          ActivityApprovalStatus.APPROVED,
        );

        expect(isValid).toBe(true);
      });

      it('PENDING -> REJECTED 应该合法（审批驳回）', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.PENDING,
          ActivityApprovalStatus.REJECTED,
        );

        expect(isValid).toBe(true);
      });

      it('REJECTED -> PENDING 应该合法（重新提交）', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.REJECTED,
          ActivityApprovalStatus.PENDING,
        );

        expect(isValid).toBe(true);
      });
    });

    describe('非法的状态流转', () => {
      it('DRAFT -> APPROVED 应该非法（必须先提交审批）', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.DRAFT,
          ActivityApprovalStatus.APPROVED,
        );

        expect(isValid).toBe(false);
      });

      it('DRAFT -> REJECTED 应该非法（必须先提交审批）', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.DRAFT,
          ActivityApprovalStatus.REJECTED,
        );

        expect(isValid).toBe(false);
      });

      it('APPROVED -> PENDING 应该非法（已通过不能回退）', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.APPROVED,
          ActivityApprovalStatus.PENDING,
        );

        expect(isValid).toBe(false);
      });

      it('APPROVED -> REJECTED 应该非法（已通过不能回退）', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.APPROVED,
          ActivityApprovalStatus.REJECTED,
        );

        expect(isValid).toBe(false);
      });

      it('APPROVED -> DRAFT 应该非法（已通过不能回退）', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.APPROVED,
          ActivityApprovalStatus.DRAFT,
        );

        expect(isValid).toBe(false);
      });

      it('REJECTED -> APPROVED 应该非法（必须先重新提交）', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.REJECTED,
          ActivityApprovalStatus.APPROVED,
        );

        expect(isValid).toBe(false);
      });

      it('REJECTED -> DRAFT 应该非法', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.REJECTED,
          ActivityApprovalStatus.DRAFT,
        );

        expect(isValid).toBe(false);
      });

      it('PENDING -> DRAFT 应该非法', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.PENDING,
          ActivityApprovalStatus.DRAFT,
        );

        expect(isValid).toBe(false);
      });
    });

    describe('相同状态流转', () => {
      it('DRAFT -> DRAFT 应该非法', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.DRAFT,
          ActivityApprovalStatus.DRAFT,
        );

        expect(isValid).toBe(false);
      });

      it('PENDING -> PENDING 应该非法', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.PENDING,
          ActivityApprovalStatus.PENDING,
        );

        expect(isValid).toBe(false);
      });

      it('APPROVED -> APPROVED 应该非法', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.APPROVED,
          ActivityApprovalStatus.APPROVED,
        );

        expect(isValid).toBe(false);
      });

      it('REJECTED -> REJECTED 应该非法', () => {
        const isValid = service.isValidTransition(
          ActivityApprovalStatus.REJECTED,
          ActivityApprovalStatus.REJECTED,
        );

        expect(isValid).toBe(false);
      });
    });
  });

  describe('getStatusDescription - 获取状态描述', () => {
    it('应该返回 DRAFT 的中文描述', () => {
      const description = service.getStatusDescription(
        ActivityApprovalStatus.DRAFT,
      );

      expect(description).toBe('草稿');
    });

    it('应该返回 PENDING 的中文描述', () => {
      const description = service.getStatusDescription(
        ActivityApprovalStatus.PENDING,
      );

      expect(description).toBe('待审批');
    });

    it('应该返回 APPROVED 的中文描述', () => {
      const description = service.getStatusDescription(
        ActivityApprovalStatus.APPROVED,
      );

      expect(description).toBe('已通过');
    });

    it('应该返回 REJECTED 的中文描述', () => {
      const description = service.getStatusDescription(
        ActivityApprovalStatus.REJECTED,
      );

      expect(description).toBe('已驳回');
    });
  });

  describe('完整的审批流程测试', () => {
    it('应该支持完整的审批通过流程', async () => {
      // 1. 提交审批（DRAFT -> PENDING）
      const submitted = await service.submitApproval({
        configId: 'config-123',
        submitterId: 'user-456',
        remark: '请审批',
      });
      expect(submitted.status).toBe(ActivityApprovalStatus.PENDING);

      // 2. 审批通过（PENDING -> APPROVED）
      const approved = await service.approve({
        configId: 'config-123',
        approverId: 'admin-789',
        remark: '批准',
      });
      expect(approved.status).toBe(ActivityApprovalStatus.APPROVED);

      // 3. 检查可以上线
      jest.spyOn(service, 'getApprovalStatus').mockResolvedValue(approved);
      const canPublish = await service.canPublish('config-123');
      expect(canPublish).toBe(true);
    });

    it('应该支持驳回后重新提交的流程', async () => {
      // 1. 提交审批（DRAFT -> PENDING）
      const submitted = await service.submitApproval({
        configId: 'config-123',
        submitterId: 'user-456',
      });
      expect(submitted.status).toBe(ActivityApprovalStatus.PENDING);

      // 2. 审批驳回（PENDING -> REJECTED）
      const rejected = await service.reject({
        configId: 'config-123',
        approverId: 'admin-789',
        remark: '需要修改',
      });
      expect(rejected.status).toBe(ActivityApprovalStatus.REJECTED);

      // 3. 重新提交（REJECTED -> PENDING）
      const resubmitted = await service.submitApproval({
        configId: 'config-123',
        submitterId: 'user-456',
        remark: '已修改，请重新审批',
      });
      expect(resubmitted.status).toBe(ActivityApprovalStatus.PENDING);

      // 4. 审批通过（PENDING -> APPROVED）
      const approved = await service.approve({
        configId: 'config-123',
        approverId: 'admin-789',
        remark: '批准',
      });
      expect(approved.status).toBe(ActivityApprovalStatus.APPROVED);
    });
  });
});
