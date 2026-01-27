import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberService } from './member.service';
import { ListMemberDto, UpdateMemberStatusDto, UpdateMemberLevelDto, UpdateReferrerDto, UpdateMemberTenantDto } from './dto';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 会员管理控制器 (Member Controller)
 * 处理会员列表查询及等级、状态、归属关系的调整请求
 */
@ApiTags('会员管理')
@Controller('admin/member')
export class MemberController {
  constructor(private readonly memberService: MemberService) { }

  /**
   * 查询会员列表
   */
  @ApiOperation({ summary: '查询会员列表' })
  @RequirePermission('admin:member:list')
  @Get('list')
  async list(@Query() query: ListMemberDto) {
    return this.memberService.list(query);
  }

  /**
   * 更新会员推荐人 (调整 C1/C2 归属)
   */
  @ApiOperation({ summary: '更新推荐人 (C1/C2)' })
  @RequirePermission('admin:member:referrer')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put('referrer')
  async updateReferrer(@Body() dto: UpdateReferrerDto) {
    return this.memberService.updateParent(dto);
  }

  /**
   * 变更会员所属租户 (归属门店)
   */
  @ApiOperation({ summary: '变更会员归属租户' })
  @RequirePermission('admin:member:tenant')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put('tenant')
  async updateTenant(@Body() dto: UpdateMemberTenantDto) {
    return this.memberService.updateTenant(dto);
  }

  /**
   * 更新会员状态 (启用/禁用)
   */
  @ApiOperation({ summary: '更新会员状态' })
  @RequirePermission('admin:member:status')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put('status')
  async updateStatus(@Body() dto: UpdateMemberStatusDto) {
    return this.memberService.updateStatus(dto);
  }

  /**
   * 手动调整会员等级 (普通/C1/C2)
   */
  @ApiOperation({ summary: '手动调整会员等级' })
  @RequirePermission('admin:member:level')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put('level')
  async updateLevel(@Body() dto: UpdateMemberLevelDto) {
    return this.memberService.updateLevel(dto);
  }
}
