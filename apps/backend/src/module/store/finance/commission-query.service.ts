import { Injectable } from '@nestjs/common';
import { Result } from 'src/common/response';
import { FormatDateFields } from 'src/common/utils';
import { Prisma } from '@prisma/client';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { CommissionRepository } from 'src/module/finance/commission/commission.repository';
import { ListCommissionDto } from './dto/store-finance.dto';

/**
 * 店铺佣金查询服务
 * 
 * @description
 * 负责店铺佣金记录的查询和列表展示
 */
@Injectable()
export class StoreCommissionQueryService {
  constructor(
    private readonly commissionRepo: CommissionRepository,
  ) {}

  /**
   * 查询佣金明细列表
   */
  async getCommissionList(query: ListCommissionDto) {
    const tenantId = TenantContext.getTenantId();
    const where: Prisma.FinCommissionWhereInput = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.memberId) {
      where.beneficiaryId = query.memberId;
    }

    const dateRange = query.getDateRange('createTime');
    if (dateRange) {
      Object.assign(where, dateRange);
    }

    if (query.orderSn || query.phone) {
      where.order = {};
      if (query.orderSn) {
        where.order.orderSn = { contains: query.orderSn };
      }
    }

    const result = await this.commissionRepo.findPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      where,
      include: {
        beneficiary: {
          select: {
            memberId: true,
            nickname: true,
            mobile: true,
            avatar: true,
          },
        },
        order: {
          select: {
            orderSn: true,
            payAmount: true,
          },
        },
      },
      orderBy: query.orderByColumn || 'createTime',
      order: query.isAsc || 'desc',
    });

    return Result.page(FormatDateFields(result.rows), result.total);
  }
}
