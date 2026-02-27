import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { ListNotificationDto } from './dto/list-notification.dto';
import { Result } from 'src/common/response';
import { FormatDateFields } from 'src/common/utils';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { JwtAuthGuard } from 'src/module/admin/common/guards/auth.guard';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 通知记录查询接口（AC-11）
 * 按租户分页查询
 */
@ApiTags('系统-通知记录')
@Controller('admin/notification')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('list')
  @ApiOperation({ summary: '通知记录列表' })
  @RequirePermission('system:notification:list')
  async list(@Query() query: ListNotificationDto) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const where: { tenantId?: string; channel?: string; status?: string } = {};
    if (!isSuper) where.tenantId = tenantId;
    if (query.channel) where.channel = query.channel;
    if (query.status) where.status = query.status;

    const [list, total] = await this.prisma.$transaction([
      this.prisma.sysNotificationLog.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.sysNotificationLog.count({ where }),
    ]);

    return Result.page(FormatDateFields(list), total);
  }
}
