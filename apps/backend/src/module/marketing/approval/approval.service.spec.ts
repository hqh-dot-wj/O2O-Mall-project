import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
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
  const mockPrisma = {
    storePlayConfig: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ApprovalService>(ApprovalService);
    jest.clearAllMocks();
  });

  // R-FLOW-APPROVAL-01
  it('Given 服务初始化完成, When 获取服务实例, Then 实例可用', () => {
    expect(service).toBeDefined();
  });

  // R-FLOW-APPROVAL-02
  it('Given 配置为草稿状态, When submitApproval, Then 状态变为待审批并写入数据库', async () => {
    mockPrisma.storePlayConfig.findFirst.mockResolvedValue({
      id: 'config-1',
      rules: {} as Prisma.JsonObject,
    });
    mockPrisma.storePlayConfig.update.mockResolvedValue({ id: 'config-1' });

    const result = await service.submitApproval({
      configId: 'config-1',
      submitterId: 'user-1',
      remark: '请审批',
    });

    expect(result.status).toBe(ActivityApprovalStatus.PENDING);
    expect(result.submitter).toBe('user-1');
    expect(result.submitTime).toBeDefined();
    expect(mockPrisma.storePlayConfig.update).toHaveBeenCalledTimes(1);
  });

  // R-PRE-APPROVAL-01
  it('Given 配置已审批通过, When submitApproval, Then 拒绝重复提交', async () => {
    mockPrisma.storePlayConfig.findFirst.mockResolvedValue({
      id: 'config-1',
      rules: {
        approval: {
          status: ActivityApprovalStatus.APPROVED,
        },
      } as Prisma.JsonObject,
    });

    await expect(
      service.submitApproval({
        configId: 'config-1',
        submitterId: 'user-1',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        msg: '当前审批状态 APPROVED 不允许提交审批',
      }),
    });
  });

  // R-FLOW-APPROVAL-03
  it('Given 配置为待审批状态, When approve, Then 状态变为已通过并保留提交信息', async () => {
    const submitTime = '2026-03-02T08:00:00.000Z';
    mockPrisma.storePlayConfig.findFirst.mockResolvedValue({
      id: 'config-1',
      rules: {
        approval: {
          status: ActivityApprovalStatus.PENDING,
          submitter: 'user-1',
          submitTime,
        },
      } as Prisma.JsonObject,
    });
    mockPrisma.storePlayConfig.update.mockResolvedValue({ id: 'config-1' });

    const result = await service.approve({
      configId: 'config-1',
      approverId: 'admin-1',
      remark: '通过',
    });

    expect(result.status).toBe(ActivityApprovalStatus.APPROVED);
    expect(result.submitter).toBe('user-1');
    expect(result.approver).toBe('admin-1');
    expect(result.approvalTime).toBeDefined();
  });

  // R-IN-APPROVAL-01
  it('Given 驳回原因为空白, When reject, Then 返回校验错误', async () => {
    await expect(
      service.reject({
        configId: 'config-1',
        approverId: 'admin-1',
        remark: '   ',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        msg: '驳回审批必须提供驳回原因',
      }),
    });
  });

  // R-PRE-APPROVAL-02
  it('Given 配置为草稿状态, When reject, Then 返回非法流转错误', async () => {
    mockPrisma.storePlayConfig.findFirst.mockResolvedValue({
      id: 'config-1',
      rules: {} as Prisma.JsonObject,
    });

    await expect(
      service.reject({
        configId: 'config-1',
        approverId: 'admin-1',
        remark: '拒绝',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        msg: '当前审批状态 DRAFT 不允许驳回',
      }),
    });
  });

  // R-RESP-APPROVAL-01
  it('Given 配置没有审批字段, When getApprovalStatus, Then 返回默认草稿状态', async () => {
    mockPrisma.storePlayConfig.findFirst.mockResolvedValue({
      id: 'config-1',
      rules: {} as Prisma.JsonObject,
    });

    const result = await service.getApprovalStatus('config-1');

    expect(result.status).toBe(ActivityApprovalStatus.DRAFT);
  });

  // R-BRANCH-APPROVAL-01
  it('Given 配置状态为已通过, When canPublish, Then 返回可上线', async () => {
    mockPrisma.storePlayConfig.findFirst.mockResolvedValue({
      id: 'config-1',
      rules: {
        approval: {
          status: ActivityApprovalStatus.APPROVED,
        },
      } as Prisma.JsonObject,
    });

    const canPublish = await service.canPublish('config-1');

    expect(canPublish).toBe(true);
  });
});
