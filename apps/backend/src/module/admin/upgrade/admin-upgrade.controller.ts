import { Controller, Get, Put, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminUpgradeService } from './admin-upgrade.service';
import { ListUpgradeApplyDto, ApproveUpgradeDto, ManualLevelDto } from './dto/upgrade.dto';
import { User } from 'src/common/decorators/user.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 管理端会员升级审批控制器 (Admin Upgrade Controller)
 * 处理会员等级提升申请的审核、驳回及管理员手动调级操作
 */
@ApiTags('会员升级管理')
@ApiBearerAuth()
@Controller('admin/upgrade')
export class AdminUpgradeController {
  constructor(private readonly upgradeService: AdminUpgradeService) {}

  /**
   * 分页查询升级申请列表 (含过滤条件)
   */
  @ApiOperation({ summary: '查询升级申请列表' })
  @RequirePermission('admin:upgrade:list')
  @Get('list')
  async list(@Query() query: ListUpgradeApplyDto) {
    return this.upgradeService.findAll(query);
  }

  /**
   * 获取升级审批统计概览 (如待处理数、总数)
   */
  @ApiOperation({ summary: '获取申请统计' })
  @RequirePermission('admin:upgrade:list')
  @Get('stats')
  async stats() {
    return this.upgradeService.getStats();
  }

  /**
   * 审批或驳回会员等级提升申请
   */
  @ApiOperation({ summary: '审批/驳回升级申请' })
  @RequirePermission('admin:upgrade:approve')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put(':id/approve')
  async approve(@Param('id') id: string, @Body() dto: ApproveUpgradeDto, @User('userId') operatorId: string) {
    return this.upgradeService.approve(id, dto, operatorId);
  }

  /**
   * 管理员手动调整会员等级 (跳过申请流程)
   */
  @ApiOperation({ summary: '手动调整会员等级' })
  @RequirePermission('admin:upgrade:manual')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put('member/:memberId/level')
  async manualLevel(
    @Param('memberId') memberId: string,
    @Body() dto: ManualLevelDto,
    @User('userId') operatorId: string,
  ) {
    return this.upgradeService.manualLevel(memberId, dto, operatorId);
  }
}
