import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/response';
import { SUCCESS_CODE } from 'src/common/response';
import { UserService } from '../admin/system/user/user.service';
import { LoginlogService } from '../admin/monitor/loginlog/loginlog.service';
import { AxiosService } from 'src/module/common/axios/axios.service';
import { RegisterDto, LoginDto } from './dto/index';
import { MenuService } from '../admin/system/menu/menu.service';
import { ClientInfoDto } from 'src/common/decorators/common.decorator';
import { StatusEnum, DelFlagEnum } from 'src/common/enum/index';
import { DashboardStatsVo } from './vo/main.vo';
import { WalletService } from '../finance/wallet/wallet.service';
import { CommissionRepository } from '../finance/commission/commission.repository';
import { StoreOrderRepository } from '../store/order/store-order.repository';
import { ProductRepository } from '../pms/product/product.repository';
import { MemberRepository } from '../admin/member/member.repository';
import { Cacheable } from 'src/common/decorators/redis.decorator';
import { CommissionStatus, PayStatus } from '@prisma/client';
import { getErrorInfo } from 'src/common/utils/error';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class MainService {
  private readonly logger = new Logger(MainService.name);

  constructor(
    private readonly menuService: MenuService,
    private readonly walletService: WalletService,
    private readonly commissionRepo: CommissionRepository,
    private readonly storeOrderRepo: StoreOrderRepository,
    private readonly productRepo: ProductRepository,
    private readonly memberRepo: MemberRepository,
  ) {}

  /**
   * 登陆记录
   */
  loginRecord() {}

  /**
   * 获取路由菜单
   */
  async getRouters(userId: number) {
    const menus = await this.menuService.getMenuListByUserId(userId);
    return Result.ok(menus);
  }

  /**
   * 获取首页统计数据
   * 使用5分钟缓存提升性能
   */
  @Cacheable('DASHBOARD:STATS:', '{tenantId}', 300)
  async getDashboardStats(tenantId: string): Promise<DashboardStatsVo> {
    this.logger.log(`Fetching dashboard stats for tenant: ${tenantId}`);

    try {
      // 并行查询所有数据源，提升性能
      const [walletBalance, todayOrders, monthOrders, productCount, memberCount, commissionStats] = await Promise.all([
        this.getWalletBalance(tenantId),
        this.getTodayOrderStats(tenantId),
        this.getMonthOrderStats(tenantId),
        this.productRepo.count({ delFlag: DelFlagEnum.NORMAL }),
        this.memberRepo.count({ tenantId }),
        this.getCommissionStats(tenantId),
      ]);

      return {
        walletBalance: Number(walletBalance),
        todayGMV: Number(todayOrders.totalAmount),
        todayOrderCount: todayOrders.count,
        monthGMV: Number(monthOrders.totalAmount),
        productCount,
        memberCount,
        settledCommission: Number(commissionStats.settled),
        pendingCommission: Number(commissionStats.pending),
      };
    } catch (error) {
      const { message, stack } = getErrorInfo(error);
      this.logger.error(`Failed to fetch dashboard stats: ${message}`, stack);
      throw error;
    }
  }

  /**
   * 获取门店钱包余额
   */
  private async getWalletBalance(tenantId: string): Promise<Decimal> {
    const storeMemberId = `STORE_${tenantId}`;
    const wallet = await this.walletService.getWallet(storeMemberId);

    if (!wallet) {
      this.logger.warn(`Wallet not found for store: ${storeMemberId}`);
      return new Decimal(0);
    }

    return wallet.balance;
  }

  /**
   * 获取今日订单统计
   */
  private async getTodayOrderStats(tenantId: string): Promise<{ totalAmount: Decimal; count: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.storeOrderRepo.aggregate({
      where: {
        tenantId,
        payStatus: PayStatus.PAID,
        payTime: {
          gte: today,
        },
      },
      _sum: {
        payAmount: true,
      },
      _count: true,
    });

    return {
      totalAmount: result._sum.payAmount || new Decimal(0),
      count: typeof result._count === 'number' ? result._count : 0,
    };
  }

  /**
   * 获取本月订单统计
   */
  private async getMonthOrderStats(tenantId: string): Promise<{ totalAmount: Decimal }> {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const result = await this.storeOrderRepo.aggregate({
      where: {
        tenantId,
        payStatus: PayStatus.PAID,
        payTime: {
          gte: firstDayOfMonth,
        },
      },
      _sum: {
        payAmount: true,
      },
    });

    return {
      totalAmount: result._sum.payAmount || new Decimal(0),
    };
  }

  /**
   * 获取佣金统计
   */
  private async getCommissionStats(tenantId: string): Promise<{ settled: Decimal; pending: Decimal }> {
    const [settledResult, pendingResult] = await Promise.all([
      // 已结算佣金
      this.commissionRepo.aggregate({
        where: {
          tenantId,
          status: CommissionStatus.SETTLED,
        },
        _sum: {
          amount: true,
        },
      }),
      // 待结算佣金
      this.commissionRepo.aggregate({
        where: {
          tenantId,
          status: CommissionStatus.FROZEN,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      settled: settledResult._sum.amount || new Decimal(0),
      pending: pendingResult._sum.amount || new Decimal(0),
    };
  }
}
