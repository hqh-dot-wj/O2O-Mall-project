import { Controller, Get, Put, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminUpgradeService } from './admin-upgrade.service';
import { ListUpgradeApplyDto, ApproveUpgradeDto, ManualLevelDto } from './dto/upgrade.dto';
import { User } from 'src/common/decorators/user.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';

@ApiTags('Admin-Upgrade')
@ApiBearerAuth()
@Controller('admin/upgrade')
export class AdminUpgradeController {
  constructor(private readonly upgradeService: AdminUpgradeService) {}

  @ApiOperation({ summary: '升级申请列表' })
  @Get('list')
  @RequirePermission('member:upgrade:list')
  async list(@Query() query: ListUpgradeApplyDto) {
    return this.upgradeService.findAll(query);
  }

  @ApiOperation({ summary: '统计' })
  @Get('stats')
  @RequirePermission('member:upgrade:list')
  async stats() {
    return this.upgradeService.getStats();
  }

  @ApiOperation({ summary: '审批/驳回' })
  @Put(':id/approve')
  @RequirePermission('member:upgrade:approve')
  async approve(@Param('id') id: string, @Body() dto: ApproveUpgradeDto, @User('userId') operatorId: string) {
    return this.upgradeService.approve(id, dto, operatorId);
  }

  @ApiOperation({ summary: '手动调级' })
  @Put('member/:memberId/level')
  @RequirePermission('member:upgrade:manual')
  async manualLevel(
    @Param('memberId') memberId: string,
    @Body() dto: ManualLevelDto,
    @User('userId') operatorId: string,
  ) {
    return this.upgradeService.manualLevel(memberId, dto, operatorId);
  }
}
