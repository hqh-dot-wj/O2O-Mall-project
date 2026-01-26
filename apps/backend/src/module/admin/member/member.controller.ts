import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberService } from './member.service';
import { PageQueryDto } from 'src/common/dto/base.dto';
import { Result } from 'src/common/response';

@ApiTags('Admin-Member Management')
@Controller('admin/member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @ApiOperation({ summary: 'List Members' })
  @Get('list')
  async list(@Query() page: PageQueryDto, @Query() query: { nickname?: string; mobile?: string }) {
    return this.memberService.list(page, query);
  }

  @ApiOperation({ summary: 'Update Parent (C1/C2)' })
  @Put('parent')
  async updateParent(@Body() body: { memberId: string; parentId: string }) {
    return this.memberService.updateParent(body.memberId, body.parentId);
  }

  @ApiOperation({ summary: 'Update Tenant' })
  @Put('tenant')
  async updateTenant(@Body() body: { memberId: string; tenantId: string }) {
    return this.memberService.updateTenant(body.memberId, body.tenantId);
  }

  @ApiOperation({ summary: 'Update Status' })
  @Put('status')
  async updateStatus(@Body() body: { memberId: string; status: string }) {
    return this.memberService.updateStatus(body.memberId, body.status);
  }
}
