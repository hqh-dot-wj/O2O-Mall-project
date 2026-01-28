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
  constructor(private readonly withdrawalService: WithdrawalService) { }

  @Get('list')
  @Api({ summary: '查询提现列表', type: WithdrawalVo })
  @RequirePermission('finance:withdrawal:list')
  async list(@Query() query: ListWithdrawalDto) {
    return await this.withdrawalService.getList(query);
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
    return await this.withdrawalService.audit(body.withdrawalId, body.action, user.userName, body.remark);
  }
}
