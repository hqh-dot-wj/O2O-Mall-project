import { Injectable, Logger } from '@nestjs/common';
import { DelFlag, Prisma } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 活动审批状态枚举
 * 
 * @description
 * 定义营销活动的审批流程状态：
 * - DRAFT: 草稿状态，运营正在编辑配置
 * - PENDING: 待审批状态，已提交等待审批人审核
 * - APPROVED: 已通过状态，审批人已批准，活动可以上线
 * - REJECTED: 已驳回状态，审批人拒绝，需要修改后重新提交
 * 
 * @验证需求 FR-7.3
 */
export enum ActivityApprovalStatus {
  /** 草稿状态 - 运营正在编辑配置 */
  DRAFT = 'DRAFT',
  
  /** 待审批状态 - 已提交等待审批 */
  PENDING = 'PENDING',
  
  /** 已通过状态 - 审批通过可以上线 */
  APPROVED = 'APPROVED',
  
  /** 已驳回状态 - 审批被拒绝需要修改 */
  REJECTED = 'REJECTED',
}

/**
 * 审批记录接口
 * 
 * @description
 * 记录活动审批的详细信息，包括审批人、审批时间、审批意见等
 */
export interface ApprovalRecord {
  /** 审批状态 */
  status: ActivityApprovalStatus;
  
  /** 审批人ID（用户ID或管理员ID） */
  approver?: string;
  
  /** 审批时间 */
  approvalTime?: Date;
  
  /** 审批意见/备注 */
  remark?: string;
  
  /** 提交审批的时间 */
  submitTime?: Date;
  
  /** 提交人ID */
  submitter?: string;
}

/**
 * 提交审批DTO
 */
export interface SubmitApprovalDto {
  /** 活动配置ID */
  configId: string;
  
  /** 提交人ID */
  submitterId: string;
  
  /** 提交说明（可选） */
  remark?: string;
}

/**
 * 审批操作DTO
 */
export interface ApprovalActionDto {
  /** 活动配置ID */
  configId: string;
  
  /** 审批人ID */
  approverId: string;
  
  /** 审批意见/备注 */
  remark?: string;
}

/**
 * 活动审批服务
 * 
 * @description
 * 提供营销活动的审批流程管理功能，支持：
 * - 提交审批：运营人员提交活动配置等待审批
 * - 审批通过：审批人批准活动配置
 * - 审批驳回：审批人拒绝活动配置并说明原因
 * - 审批状态查询：查询活动的审批状态和历史记录
 * 
 * 审批流程：
 * 1. 运营创建活动配置（状态：DRAFT）
 * 2. 运营提交审批（状态：DRAFT -> PENDING）
 * 3. 审批人审核：
 *    - 通过：PENDING -> APPROVED（活动可以上线）
 *    - 驳回：PENDING -> REJECTED（需要修改后重新提交）
 * 4. 如果被驳回，运营修改后可以重新提交（REJECTED -> PENDING）
 * 
 * @example
 * ```typescript
 * // 提交审批
 * await approvalService.submitApproval({
 *   configId: 'config-123',
 *   submitterId: 'user-456',
 *   remark: '新春促销活动，请审批'
 * });
 * 
 * // 审批通过
 * await approvalService.approve({
 *   configId: 'config-123',
 *   approverId: 'admin-789',
 *   remark: '活动方案合理，批准上线'
 * });
 * 
 * // 审批驳回
 * await approvalService.reject({
 *   configId: 'config-123',
 *   approverId: 'admin-789',
 *   remark: '折扣力度过大，请调整后重新提交'
 * });
 * ```
 * 
 * @验证需求 FR-7.3
 */
@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);
  private readonly approvalKey = 'approval';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 提交活动审批
   * 
   * @description
   * 运营人员提交活动配置等待审批。
   * 
   * 前置条件：
   * - 活动配置必须存在
   * - 当前状态必须是 DRAFT 或 REJECTED
   * 
   * 状态变更：
   * - DRAFT -> PENDING
   * - REJECTED -> PENDING
   * 
   * @param dto - 提交审批DTO
   * @returns 更新后的审批记录
   * 
   * @throws {Error} 如果活动不存在或状态不允许提交审批
   * 
   * @example
   * ```typescript
   * const result = await approvalService.submitApproval({
   *   configId: 'config-123',
   *   submitterId: 'user-456',
   *   remark: '新春促销活动，请审批'
   * });
   * 
   * console.log(result.status); // 'PENDING'
   * console.log(result.submitTime); // 提交时间
   * ```
   * 
   * @验证需求 FR-7.3
   */
  async submitApproval(dto: SubmitApprovalDto): Promise<ApprovalRecord> {
    const { configId, submitterId, remark } = dto;

    const config = await this.getConfigOrThrow(configId);
    const currentRecord = this.getApprovalRecordFromRules(config.rules);
    BusinessException.throwIf(
      !this.isValidTransition(currentRecord.status, ActivityApprovalStatus.PENDING),
      `当前审批状态 ${currentRecord.status} 不允许提交审批`,
    );

    const approvalRecord: ApprovalRecord = {
      status: ActivityApprovalStatus.PENDING,
      submitter: submitterId,
      submitTime: new Date(),
      remark: this.normalizeString(remark),
    };

    await this.persistApprovalRecord(configId, config.rules, approvalRecord);

    this.logger.log(
      `[提交审批] 活动 ${configId} 审批状态已更新为 PENDING`,
    );

    return approvalRecord;
  }

  /**
   * 审批通过
   * 
   * @description
   * 审批人批准活动配置，活动可以上线。
   * 
   * 前置条件：
   * - 活动配置必须存在
   * - 当前状态必须是 PENDING
   * 
   * 状态变更：
   * - PENDING -> APPROVED
   * 
   * @param dto - 审批操作DTO
   * @returns 更新后的审批记录
   * 
   * @throws {Error} 如果活动不存在或状态不允许审批
   * 
   * @example
   * ```typescript
   * const result = await approvalService.approve({
   *   configId: 'config-123',
   *   approverId: 'admin-789',
   *   remark: '活动方案合理，批准上线'
   * });
   * 
   * console.log(result.status); // 'APPROVED'
   * console.log(result.approver); // 'admin-789'
   * console.log(result.approvalTime); // 审批时间
   * ```
   * 
   * @验证需求 FR-7.3
   */
  async approve(dto: ApprovalActionDto): Promise<ApprovalRecord> {
    const { configId, approverId, remark } = dto;

    const config = await this.getConfigOrThrow(configId);
    const currentRecord = this.getApprovalRecordFromRules(config.rules);
    BusinessException.throwIf(
      !this.isValidTransition(currentRecord.status, ActivityApprovalStatus.APPROVED),
      `当前审批状态 ${currentRecord.status} 不允许审批通过`,
    );

    const approvalRecord: ApprovalRecord = {
      ...currentRecord,
      status: ActivityApprovalStatus.APPROVED,
      approver: approverId,
      approvalTime: new Date(),
      remark: this.normalizeString(remark) ?? currentRecord.remark,
    };

    await this.persistApprovalRecord(configId, config.rules, approvalRecord);

    this.logger.log(
      `[审批通过] 活动 ${configId} 审批状态已更新为 APPROVED`,
    );

    return approvalRecord;
  }

  /**
   * 审批驳回
   * 
   * @description
   * 审批人拒绝活动配置，需要运营修改后重新提交。
   * 
   * 前置条件：
   * - 活动配置必须存在
   * - 当前状态必须是 PENDING
   * - 必须提供驳回原因（remark）
   * 
   * 状态变更：
   * - PENDING -> REJECTED
   * 
   * @param dto - 审批操作DTO
   * @returns 更新后的审批记录
   * 
   * @throws {Error} 如果活动不存在、状态不允许驳回或未提供驳回原因
   * 
   * @example
   * ```typescript
   * const result = await approvalService.reject({
   *   configId: 'config-123',
   *   approverId: 'admin-789',
   *   remark: '折扣力度过大，请调整后重新提交'
   * });
   * 
   * console.log(result.status); // 'REJECTED'
   * console.log(result.approver); // 'admin-789'
   * console.log(result.remark); // '折扣力度过大，请调整后重新提交'
   * ```
   * 
   * @验证需求 FR-7.3
   */
  async reject(dto: ApprovalActionDto): Promise<ApprovalRecord> {
    const { configId, approverId, remark } = dto;

    const rejectReason = this.normalizeString(remark);
    BusinessException.throwIf(!rejectReason, '驳回审批必须提供驳回原因');

    const config = await this.getConfigOrThrow(configId);
    const currentRecord = this.getApprovalRecordFromRules(config.rules);
    BusinessException.throwIf(
      !this.isValidTransition(currentRecord.status, ActivityApprovalStatus.REJECTED),
      `当前审批状态 ${currentRecord.status} 不允许驳回`,
    );

    const approvalRecord: ApprovalRecord = {
      ...currentRecord,
      status: ActivityApprovalStatus.REJECTED,
      approver: approverId,
      approvalTime: new Date(),
      remark: rejectReason,
    };

    await this.persistApprovalRecord(configId, config.rules, approvalRecord);

    this.logger.log(
      `[审批驳回] 活动 ${configId} 审批状态已更新为 REJECTED`,
    );

    return approvalRecord;
  }

  /**
   * 获取活动的审批状态
   * 
   * @description
   * 查询活动的当前审批状态和审批记录。
   * 
   * @param configId - 活动配置ID
   * @returns 审批记录
   * 
   * @throws {Error} 如果活动不存在
   * 
   * @example
   * ```typescript
   * const record = await approvalService.getApprovalStatus('config-123');
   * 
   * console.log(record.status); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT'
   * console.log(record.approver); // 审批人ID（如果已审批）
   * console.log(record.approvalTime); // 审批时间（如果已审批）
   * console.log(record.remark); // 审批意见
   * ```
   * 
   * @验证需求 FR-7.3
   */
  async getApprovalStatus(configId: string): Promise<ApprovalRecord> {
    this.logger.debug(`[查询审批状态] 活动 ${configId}`);

    const config = await this.getConfigOrThrow(configId);
    return this.getApprovalRecordFromRules(config.rules);
  }

  /**
   * 检查活动是否可以上线
   * 
   * @description
   * 检查活动的审批状态是否允许上线。
   * 只有审批状态为 APPROVED 的活动才能上线。
   * 
   * @param configId - 活动配置ID
   * @returns 是否可以上线
   * 
   * @example
   * ```typescript
   * const canPublish = await approvalService.canPublish('config-123');
   * 
   * if (!canPublish) {
   *   throw new Error('活动未通过审批，无法上线');
   * }
   * ```
   * 
   * @验证需求 FR-7.3
   */
  async canPublish(configId: string): Promise<boolean> {
    const record = await this.getApprovalStatus(configId);
    const canPublish = record.status === ActivityApprovalStatus.APPROVED;

    this.logger.debug(
      `[检查上线权限] 活动 ${configId} 审批状态：${record.status}，` +
        `${canPublish ? '可以' : '不可以'}上线`,
    );

    return canPublish;
  }

  /**
   * 验证审批状态流转是否合法
   * 
   * @description
   * 检查从当前状态到目标状态的流转是否符合审批流程规则。
   * 
   * 合法的状态流转：
   * - DRAFT -> PENDING（提交审批）
   * - PENDING -> APPROVED（审批通过）
   * - PENDING -> REJECTED（审批驳回）
   * - REJECTED -> PENDING（重新提交）
   * 
   * @param currentStatus - 当前审批状态
   * @param targetStatus - 目标审批状态
   * @returns 是否允许流转
   * 
   * @example
   * ```typescript
   * // 合法流转
   * isValidTransition('DRAFT', 'PENDING'); // true
   * isValidTransition('PENDING', 'APPROVED'); // true
   * 
   * // 非法流转
   * isValidTransition('DRAFT', 'APPROVED'); // false
   * isValidTransition('APPROVED', 'PENDING'); // false
   * ```
   * 
   * @验证需求 FR-7.3
   */
  isValidTransition(
    currentStatus: ActivityApprovalStatus,
    targetStatus: ActivityApprovalStatus,
  ): boolean {
    // 定义合法的状态流转规则
    const validTransitions: Record<
      ActivityApprovalStatus,
      ActivityApprovalStatus[]
    > = {
      [ActivityApprovalStatus.DRAFT]: [ActivityApprovalStatus.PENDING],
      [ActivityApprovalStatus.PENDING]: [
        ActivityApprovalStatus.APPROVED,
        ActivityApprovalStatus.REJECTED,
      ],
      [ActivityApprovalStatus.APPROVED]: [], // 已通过的活动不能再改变审批状态
      [ActivityApprovalStatus.REJECTED]: [ActivityApprovalStatus.PENDING], // 被驳回后可以重新提交
    };

    const allowedTargets = validTransitions[currentStatus] || [];
    const isValid = allowedTargets.includes(targetStatus);

    if (!isValid) {
      this.logger.warn(
        `[状态流转校验] 非法的审批状态流转：${currentStatus} -> ${targetStatus}`,
      );
    }

    return isValid;
  }

  /**
   * 获取审批状态的描述信息
   * 
   * @description
   * 返回审批状态的中文描述，便于前端展示。
   * 
   * @param status - 审批状态
   * @returns 状态描述
   * 
   * @example
   * ```typescript
   * getStatusDescription('DRAFT'); // '草稿'
   * getStatusDescription('PENDING'); // '待审批'
   * getStatusDescription('APPROVED'); // '已通过'
   * getStatusDescription('REJECTED'); // '已驳回'
   * ```
   */
  getStatusDescription(status: ActivityApprovalStatus): string {
    const descriptions: Record<ActivityApprovalStatus, string> = {
      [ActivityApprovalStatus.DRAFT]: '草稿',
      [ActivityApprovalStatus.PENDING]: '待审批',
      [ActivityApprovalStatus.APPROVED]: '已通过',
      [ActivityApprovalStatus.REJECTED]: '已驳回',
    };

    return descriptions[status] || '未知状态';
  }

  private async getConfigOrThrow(configId: string): Promise<{ id: string; rules: Prisma.JsonValue }> {
    const config = await this.prisma.storePlayConfig.findFirst({
      where: {
        id: configId,
        delFlag: DelFlag.NORMAL,
      },
      select: {
        id: true,
        rules: true,
      },
    });

    BusinessException.throwIfNull(config, '营销配置不存在');
    return config;
  }

  private async persistApprovalRecord(
    configId: string,
    currentRules: Prisma.JsonValue,
    approvalRecord: ApprovalRecord,
  ): Promise<void> {
    await this.prisma.storePlayConfig.update({
      where: { id: configId },
      data: {
        rules: this.buildRulesWithApproval(currentRules, approvalRecord),
      },
    });
  }

  private getApprovalRecordFromRules(rules: Prisma.JsonValue): ApprovalRecord {
    const rulesObject = this.toObject(rules);
    const approvalObject = this.toObject(rulesObject[this.approvalKey]);

    return {
      status: this.parseStatus(approvalObject.status),
      submitter: this.normalizeString(approvalObject.submitter),
      submitTime: this.toDate(approvalObject.submitTime),
      approver: this.normalizeString(approvalObject.approver),
      approvalTime: this.toDate(approvalObject.approvalTime),
      remark: this.normalizeString(approvalObject.remark),
    };
  }

  private buildRulesWithApproval(
    currentRules: Prisma.JsonValue,
    approvalRecord: ApprovalRecord,
  ): Prisma.InputJsonValue {
    const rulesObject = this.toObject(currentRules);
    const approvalObject: Record<string, Prisma.InputJsonValue> = {
      status: approvalRecord.status,
    };

    if (approvalRecord.submitter) {
      approvalObject.submitter = approvalRecord.submitter;
    }
    if (approvalRecord.submitTime) {
      approvalObject.submitTime = approvalRecord.submitTime.toISOString();
    }
    if (approvalRecord.approver) {
      approvalObject.approver = approvalRecord.approver;
    }
    if (approvalRecord.approvalTime) {
      approvalObject.approvalTime = approvalRecord.approvalTime.toISOString();
    }
    if (approvalRecord.remark) {
      approvalObject.remark = approvalRecord.remark;
    }

    return {
      ...rulesObject,
      [this.approvalKey]: approvalObject,
    } as Prisma.InputJsonValue;
  }

  private parseStatus(value: unknown): ActivityApprovalStatus {
    const statuses: ActivityApprovalStatus[] = [
      ActivityApprovalStatus.DRAFT,
      ActivityApprovalStatus.PENDING,
      ActivityApprovalStatus.APPROVED,
      ActivityApprovalStatus.REJECTED,
    ];

    return statuses.includes(value as ActivityApprovalStatus)
      ? (value as ActivityApprovalStatus)
      : ActivityApprovalStatus.DRAFT;
  }

  private toObject(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private toDate(value: unknown): Date | undefined {
    const dateString = this.normalizeString(value);
    if (!dateString) {
      return undefined;
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date;
  }

  private normalizeString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
  }
}
