import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { User, UserDto } from 'src/module/admin/system/user/user.decorator';
import { WithdrawalService } from './withdrawal.service';
import { ListWithdrawalDto } from './dto/list-withdrawal.dto';
import { WithdrawalVo } from './vo/withdrawal.vo';
import { TenantContext } from 'src/common/tenant';

@ApiTags('财务管理-提现管理')
@Controller('finance/withdrawal')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get('list')
  @Api({ summary: '查询提现列表', type: WithdrawalVo })
  @RequirePermission('finance:withdrawal:list')
  async list(@Query() query: ListWithdrawalDto, @User() user: UserDto) {
    // 1. 获取当前用户租户ID
    const currentUserTenantId = user.user?.tenantId || TenantContext.SUPER_TENANT_ID;

    // 2. 判断是否为超级租户 (HQ)
    const isSuperTenant = currentUserTenantId === TenantContext.SUPER_TENANT_ID;

    // 3. 构建最终查询 tenantId
    let targetTenantId = currentUserTenantId;

    if (isSuperTenant) {
      // 如果是 HQ，允许查询指定租户，否则查询所有(传递 undefined/null 给 Service处理)
      // Service 需支持 tenantId 为空查所有
      targetTenantId = query.tenantId || null;
    }

    return await this.withdrawalService.getList(query, targetTenantId);
  }

  @Post('audit')
  @Api({ summary: '审核提现' })
  @RequirePermission('finance:withdrawal:audit')
  async audit(
    @Body()
    body: {
      withdrawalId: string;
      action: 'APPROVE' | 'REJECT';
      remark?: string;
    },
    @User() user: UserDto,
  ) {
    const tenantId = user.user?.tenantId || TenantContext.SUPER_TENANT_ID;

    return await this.withdrawalService.audit(body.withdrawalId, tenantId, body.action, user.userName, body.remark);
  }
}
