import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';

/**
 * 活动审批模块
 * 
 * @description
 * 提供营销活动的审批流程管理功能，包括：
 * - 提交审批
 * - 审批通过
 * - 审批驳回
 * - 审批状态查询
 * 
 * 该模块可以被其他模块导入使用，例如：
 * - config 模块：在活动上线前检查审批状态
 * - instance 模块：在用户参与活动前检查审批状态
 * 
 * @example
 * ```typescript
 * // 在其他模块中导入
 * @Module({
 *   imports: [ApprovalModule],
 *   // ...
 * })
 * export class ConfigModule {}
 * ```
 * 
 * @验证需求 FR-7.3
 */
@Module({
  providers: [ApprovalService],
  exports: [ApprovalService], // 导出服务供其他模块使用
})
export class ApprovalModule {}
